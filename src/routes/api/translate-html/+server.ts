import type { RequestHandler } from '@sveltejs/kit';
import { PASSWORD } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';
import openai from '$lib/openaiClient';

function cleanHtml(html: string): string {
  let cleanedHtml = html.replace(/ dir="ltr"/g, '');
  cleanedHtml = cleanedHtml.replace(/<div id="mct-script"><\/div>/g, '');
  cleanedHtml = cleanedHtml.replace(/<p>&nbsp;<\/p>/g, '');
  return cleanedHtml;
}

function splitHtmlIntoChunks(html: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const regex = /(<\/?[^>]+>)/g;
  let lastIndex = 0;

  html.replace(regex, (match, tag, index) => {
    const textPart = html.substring(lastIndex, index);
    if (currentChunk.length + textPart.length > chunkSize) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += textPart;
    if (currentChunk.length + match.length > chunkSize) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += match;
    lastIndex = index + match.length;
  });

  const remainingText = html.substring(lastIndex);
  if (remainingText.length > 0) {
    if (currentChunk.length + remainingText.length > chunkSize) {
      chunks.push(currentChunk);
      chunks.push(remainingText);
    } else {
      currentChunk += remainingText;
      chunks.push(currentChunk);
    }
  } else if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function translateLongHtmlContent(htmlContent: string, srcLanguage: string, targetLanguage: string, gptModel: string): Promise<string> {
  const chunkSize = 2000;
  const chunks = splitHtmlIntoChunks(htmlContent, chunkSize);

  const translatedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: `Translate the following HTML from ${srcLanguage} to ${targetLanguage}, preserving the HTML tags:\n\n${chunk}` }],
        model: gptModel
      });
      return chatCompletion.choices[0].message.content;
    })
  );

  return translatedChunks.join('');
}

export const POST: RequestHandler = async ({ request }) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Allow all origins for CORS
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const { articleId, srcLanguage = 'en', targetLanguage, htmlContent, gptModel = 'gpt-3.5-turbo', password } = await request.json();

    if (password !== PASSWORD) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 403, headers });
    }

    const cleanedHtmlContent = cleanHtml(htmlContent);

    console.log(`Received request to translate articleId: ${articleId} from ${srcLanguage} to ${targetLanguage}`);

    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('article_id', articleId)
      .eq('src_language', srcLanguage)
      .eq('target_language', targetLanguage)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Supabase error: ${error.message}`);
      console.error(`Supabase error details: ${JSON.stringify(error, null, 2)}`);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (data) {
      console.log('Translation found in Supabase');
      return new Response(JSON.stringify({ translation: data.translation, source: 'supabase', requestData: { articleId, srcLanguage, targetLanguage, htmlContent: cleanedHtmlContent } }), { status: 200, headers });
    }

    console.log('Translation not found in Supabase, using ChatGPT');

    let translatedHtml;
    if (cleanedHtmlContent.length > 2000) {
      translatedHtml = await translateLongHtmlContent(cleanedHtmlContent, srcLanguage, targetLanguage, gptModel);
    } else {
      const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: `Translate the following HTML from ${srcLanguage} to ${targetLanguage}, preserving the HTML tags. Remove empty <p> tags that only contain &nbsp;, please:\n\n${cleanedHtmlContent}` }],
        model: gptModel
      });
      translatedHtml = chatCompletion.choices[0].message.content;
      console.log('Token usage:', chatCompletion.usage);
    }

    const { error: insertError } = await supabase
      .from('translations')
      .insert([
        { article_id: articleId, original_string: cleanedHtmlContent, src_language: srcLanguage, target_language: targetLanguage, translation: translatedHtml, gpt_model: gptModel }
      ]);

    if (insertError) {
      console.error(`Supabase insert error: ${insertError.message}`);
      console.error(`Supabase insert error details: ${JSON.stringify(insertError, null, 2)}`);
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    console.log('Translation successful and stored in Supabase');
    return new Response(JSON.stringify({ translation: translatedHtml, source: 'chatgpt', requestData: { articleId, srcLanguage, targetLanguage, htmlContent: cleanedHtmlContent } }), { status: 200, headers });
  } catch (error) {
    console.error(`Error during translation process: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};