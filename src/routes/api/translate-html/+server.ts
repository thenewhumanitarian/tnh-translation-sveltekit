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

async function translateChunk(chunk: string, srcLanguage: string, targetLanguage: string, gptModel: string): Promise<string> {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: `Translate the following HTML from ${srcLanguage} to ${targetLanguage}, preserving the HTML tags:\n\n${chunk}` }],
    model: gptModel
  });
  return chatCompletion.choices[0].message.content;
}

async function storeTempTranslation(articleId: string, targetLanguage: string, chunkIndex: number, translation: string, lastUpdated: string) {
  const { error } = await supabase
    .from('temp_translations')
    .insert([{ article_id: articleId, target_language: targetLanguage, chunk_index: chunkIndex, translation, last_updated: lastUpdated }]);
  if (error) {
    console.error(`Supabase insert error: ${error.message}`);
    console.error(`Supabase insert error details: ${JSON.stringify(error, null, 2)}`);
    throw new Error(`Supabase insert error: ${error.message}`);
  }
}

async function finalizeTranslation(articleId: string, targetLanguage: string, lastUpdated: string, originalString: string) {
  const { data, error } = await supabase
    .from('temp_translations')
    .select('translation')
    .eq('article_id', articleId)
    .eq('target_language', targetLanguage)
    .eq('last_updated', lastUpdated)
    .order('chunk_index', { ascending: true });

  if (error) {
    console.error(`Supabase fetch error: ${error.message}`);
    console.error(`Supabase fetch error details: ${JSON.stringify(error, null, 2)}`);
    throw new Error(`Supabase fetch error: ${error.message}`);
  }

  const fullTranslation = data.map(item => item.translation).join('');

  const { error: insertError } = await supabase
    .from('translations')
    .insert([{ article_id: articleId, src_language: 'en', target_language: targetLanguage, translation: fullTranslation, gpt_model: 'gpt-3.5-turbo', last_updated: lastUpdated, original_string: originalString }]);

  if (insertError) {
    console.error(`Supabase insert error: ${insertError.message}`);
    console.error(`Supabase insert error details: ${JSON.stringify(insertError, null, 2)}`);
    throw new Error(`Supabase insert error: ${insertError.message}`);
  }

  // Clean up temp_translations
  const { error: deleteError } = await supabase
    .from('temp_translations')
    .delete()
    .eq('article_id', articleId)
    .eq('target_language', targetLanguage)
    .eq('last_updated', lastUpdated);

  if (deleteError) {
    console.error(`Supabase delete error: ${deleteError.message}`);
    console.error(`Supabase delete error details: ${JSON.stringify(deleteError, null, 2)}`);
    throw new Error(`Supabase delete error: ${deleteError.message}`);
  }

  return fullTranslation;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, targetLanguage, htmlContent, gptModel = 'gpt-3.5-turbo', password, lastUpdated } = await request.json();

    if (password !== PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const cleanedHtmlContent = cleanHtml(htmlContent);

    console.log(`Received request to translate articleId: ${articleId} to ${targetLanguage}`);

    // Check if translation exists in Supabase by matching the article ID, target language, and last updated date
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('article_id', articleId)
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
      return new Response(JSON.stringify({ translation: data.translation, source: 'supabase', requestData: { articleId, targetLanguage, htmlContent: cleanedHtmlContent } }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    console.log('Translation not found in Supabase, using ChatGPT');

    const chunks = splitHtmlIntoChunks(cleanedHtmlContent, 2000);

    // Translate and store chunks asynchronously
    await Promise.all(chunks.map(async (chunk, index) => {
      const translatedChunk = await translateChunk(chunk, 'en', targetLanguage, gptModel);
      await storeTempTranslation(articleId, targetLanguage, index, translatedChunk, lastUpdated);
    }));

    // Finalize translation
    const fullTranslation = await finalizeTranslation(articleId, targetLanguage, lastUpdated, cleanedHtmlContent);

    // Return the new translation
    return new Response(JSON.stringify({ translation: fullTranslation, source: 'chatgpt', requestData: { articleId, targetLanguage, htmlContent: cleanedHtmlContent } }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
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