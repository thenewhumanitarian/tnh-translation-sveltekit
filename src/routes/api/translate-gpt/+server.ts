import type { RequestHandler } from '@sveltejs/kit';
import { PASSWORD } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';
import openai from '$lib/openaiClient';

function cleanHtml(html: string): string {
  let cleanedHtml = html.replace(/ dir="ltr"/g, '');
  cleanedHtml = cleanedHtml.replace(/<div id="mct-script"><\/div>/g, '');
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

async function translateHtmlChunk(chunk: string, srcLanguage: string, targetLanguage: string, gptModel: string): Promise<string> {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: `Translate the following HTML from ${srcLanguage} to ${targetLanguage}, preserving the HTML tags:\n\n${chunk}` }],
    model: gptModel
  });

  return chatCompletion.choices[0].message.content;
}

async function logAccess(source: string, articleId: string, srcLang: string, targetLang: string) {
  const { error } = await supabase.from('access_logs').insert([
    {
      article_id: articleId,
      src_language: srcLang,
      target_language: targetLang,
      source,
      timestamp: new Date().toISOString()
    }
  ]);

  if (error) {
    console.error('Error logging access:', error.message);
    throw new Error(`Supabase error: ${error.message}`);
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, srcLanguage = 'en', targetLanguage, htmlContent, gptModel = 'gpt-3.5-turbo', password, lastUpdated } = await request.json();

    if (password !== PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
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
      await logAccess('supabase', articleId, srcLanguage, targetLanguage);
      // Return existing translation
      return new Response(JSON.stringify({ translation: data.translation, source: 'supabase' }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    console.log('Translation not found in Supabase, using ChatGPT');

    // If translation doesn't exist, use ChatGPT to translate
    const chunkSize = 2000; // Define chunk size
    const chunks = splitHtmlIntoChunks(cleanedHtmlContent, chunkSize);

    console.log(`Total chunks: ${chunks.length}`);

    const translationPromises = chunks.map((chunk, index) => {
      console.log(`Translating chunk ${index + 1}/${chunks.length}`);
      return translateHtmlChunk(chunk, srcLanguage, targetLanguage, gptModel);
    });

    const translatedChunks = await Promise.all(translationPromises);

    const finalTranslation = translatedChunks.join('');

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

    await logAccess('chatgpt', articleId, srcLanguage, targetLanguage);

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