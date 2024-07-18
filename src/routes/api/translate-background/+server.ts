import type { RequestHandler } from '@sveltejs/kit';
import { PASSWORD } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';
import openai from '$lib/openaiClient';

interface HtmlNode {
  tag: string;
  content: string;
  children: HtmlNode[];
}

function cleanHtml(html: string): string {
  let cleanedHtml = html.replace(/ dir="ltr"/g, '');
  cleanedHtml = cleanedHtml.replace(/<div id="mct-script"><\/div>/g, '');
  return cleanedHtml;
}

function parseHtml(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  const stack: HtmlNode[] = [];
  const regex = /(<\/?[^>]+>)/g;
  let lastIndex = 0;

  html.replace(regex, (match, tag, index) => {
    const textPart = html.substring(lastIndex, index).trim();
    if (textPart) {
      const textNode: HtmlNode = { tag: '', content: textPart, children: [] };
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(textNode);
      } else {
        nodes.push(textNode);
      }
    }

    if (tag.startsWith('</')) {
      const node = stack.pop();
      if (node && stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      } else if (node) {
        nodes.push(node);
      }
    } else {
      const newNode: HtmlNode = { tag, content: '', children: [] };
      stack.push(newNode);
    }
    lastIndex = index + match.length;
  });

  const remainingText = html.substring(lastIndex).trim();
  if (remainingText) {
    const textNode: HtmlNode = { tag: '', content: remainingText, children: [] };
    if (stack.length > 0) {
      stack[stack.length - 1].children.push(textNode);
    } else {
      nodes.push(textNode);
    }
  }

  while (stack.length > 0) {
    const node = stack.pop();
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

async function translateHtmlNode(node: HtmlNode, srcLanguage: string, targetLanguage: string, gptModel: string): Promise<HtmlNode> {
  if (node.tag) {
    const translatedChildren = await Promise.all(node.children.map(child => translateHtmlNode(child, srcLanguage, targetLanguage, gptModel)));
    return { ...node, children: translatedChildren };
  } else {
    const translatedContent = await translateHtmlChunk(node.content, srcLanguage, targetLanguage, gptModel);
    return { ...node, content: translatedContent };
  }
}

async function translateHtmlChunk(chunk: string, srcLanguage: string, targetLanguage: string, gptModel: string): Promise<string> {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: `Translate the following text from ${srcLanguage} to ${targetLanguage}:\n\n${chunk}` }],
    model: gptModel
  });

  return chatCompletion.choices[0].message.content;
}

function reconstructHtml(nodes: HtmlNode[]): string {
  return nodes.map(node => {
    if (node.tag) {
      const childrenHtml = reconstructHtml(node.children);
      return `${node.tag}${childrenHtml}${node.tag.replace('<', '</')}`;
    } else {
      return node.content;
    }
  }).join('');
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, srcLanguage = 'en', targetLanguage, htmlContent, gptModel = 'gpt-3.5-turbo', password, lastUpdated } = await request.json();

    if (password !== PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const cleanedHtmlContent = cleanHtml(htmlContent);

    console.log(`Received request to translate articleId: ${articleId} from ${srcLanguage} to ${targetLanguage}`);

    // Check if translation exists in Supabase by matching the article ID, target language, and last updated time
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('article_id', articleId)
      .eq('src_language', srcLanguage)
      .eq('target_language', targetLanguage)
      .eq('last_updated', lastUpdated)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
      console.error(`Supabase error: ${error.message}`);
      console.error(`Supabase error details: ${JSON.stringify(error, null, 2)}`);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (data) {
      console.log('Translation found in Supabase');
      // Return existing translation
      return new Response(JSON.stringify({ translation: data.translation, source: 'supabase' }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    console.log('Translation not found in Supabase, using ChatGPT');

    // If translation doesn't exist, use ChatGPT to translate
    const nodes = parseHtml(cleanedHtmlContent);

    console.log(`Total nodes: ${nodes.length}`);

    const translatedNodes = await Promise.all(nodes.map(node => translateHtmlNode(node, srcLanguage, targetLanguage, gptModel)));

    const finalTranslation = reconstructHtml(translatedNodes);

    // Log original string to ensure it's correct
    console.log('Original String:', cleanedHtmlContent);

    // Store the final translation in the translations table
    const { error: insertError } = await supabase
      .from('translations')
      .insert([
        { article_id: articleId, src_language: srcLanguage, target_language: targetLanguage, translation: finalTranslation, original_string: cleanedHtmlContent, gpt_model: gptModel, last_updated: lastUpdated }
      ]);

    if (insertError) {
      console.error(`Supabase insert error: ${insertError.message}`);
      console.error(`Supabase insert error details: ${JSON.stringify(insertError, null, 2)}`);
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    console.log('Translation successful and stored in Supabase');
    // Return the new translation
    return new Response(JSON.stringify({ translation: finalTranslation, source: 'chatgpt' }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    console.error(`Error during translation process: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};