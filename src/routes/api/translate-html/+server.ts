import type { RequestHandler } from '@sveltejs/kit';
import { PASSWORD } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';
import openai from '$lib/openaiClient';

function cleanHtml(html: string): string {
  let cleanedHtml = html.replace(/ dir="ltr"/g, '');
  cleanedHtml = cleanedHtml.replace(/<div id="mct-script"><\/div>/g, '');
  return cleanedHtml;
}

async function storeChunkTranslation(articleId, srcLanguage, targetLanguage, chunkIndex, totalChunks, translation) {
  const { error } = await supabase
    .from('temp_translations')
    .insert([
      { article_id: articleId, src_language: srcLanguage, target_language: targetLanguage, chunk_index: chunkIndex, total_chunks: totalChunks, translation: translation }
    ]);

  if (error) {
    console.error(`Supabase insert error: ${error.message}`);
    console.error(`Supabase insert error details: ${JSON.stringify(error, null, 2)}`);
    throw new Error(`Supabase insert error: ${error.message}`);
  }
}

async function stitchAndStoreTranslation(articleId, srcLanguage, targetLanguage, totalChunks, lastUpdated) {
  const { data, error } = await supabase
    .from('temp_translations')
    .select('translation')
    .eq('article_id', articleId)
    .eq('src_language', srcLanguage)
    .eq('target_language', targetLanguage)
    .order('chunk_index', { ascending: true });

  if (error) {
    console.error(`Supabase error: ${error.message}`);
    console.error(`Supabase error details: ${JSON.stringify(error, null, 2)}`);
    throw new Error(`Supabase error: ${error.message}`);
  }

  const translatedHtml = data.map(chunk => chunk.translation).join('');

  // Store the new translation in Supabase
  const { error: insertError } = await supabase
    .from('translations')
    .insert([
      { article_id: articleId, original_string: translatedHtml, src_language: srcLanguage, target_language: targetLanguage, translation: translatedHtml, last_updated: lastUpdated }
    ]);

  if (insertError) {
    console.error(`Supabase insert error: ${insertError.message}`);
    console.error(`Supabase insert error details: ${JSON.stringify(insertError, null, 2)}`);
    throw new Error(`Supabase insert error: ${insertError.message}`);
  }

  // Clean up temp_translations table
  const { error: cleanupError } = await supabase
    .from('temp_translations')
    .delete()
    .eq('article_id', articleId)
    .eq('src_language', srcLanguage)
    .eq('target_language', targetLanguage);

  if (cleanupError) {
    console.error(`Supabase cleanup error: ${cleanupError.message}`);
    console.error(`Supabase cleanup error details: ${JSON.stringify(cleanupError, null, 2)}`);
    throw new Error(`Supabase cleanup error: ${cleanupError.message}`);
  }

  return translatedHtml;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, srcLanguage = 'en', targetLanguage, htmlContent, gptModel = 'gpt-3.5-turbo', password, lastUpdated, chunkIndex, totalChunks } = await request.json();

    if (password !== PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const cleanedHtmlContent = cleanHtml(htmlContent);

    console.log(`Received request to translate articleId: ${articleId} from ${srcLanguage} to ${targetLanguage}, chunk ${chunkIndex + 1}/${totalChunks}`);

    // Translate the chunk
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: `Translate the following HTML from ${srcLanguage} to ${targetLanguage}, preserving the HTML tags:\n\n${cleanedHtmlContent}` }],
      model: gptModel
    });
    const translatedHtml = chatCompletion.choices[0].message.content;

    // Store the chunk translation
    await storeChunkTranslation(articleId, srcLanguage, targetLanguage, chunkIndex, totalChunks, translatedHtml);

    // If this is the last chunk, stitch the translations together
    if (chunkIndex + 1 === totalChunks) {
      const finalTranslation = await stitchAndStoreTranslation(articleId, srcLanguage, targetLanguage, totalChunks, lastUpdated);
      return new Response(JSON.stringify({ translation: finalTranslation, source: 'chatgpt', requestData: { articleId, srcLanguage, targetLanguage, htmlContent: cleanedHtmlContent } }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return new Response(JSON.stringify({ message: 'Chunk stored successfully' }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
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