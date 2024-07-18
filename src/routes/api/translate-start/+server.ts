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

async function translateLongHtmlContent(htmlContent: string, srcLanguage: string, targetLanguage: string, gptModel: string): Promise<string[]> {
  const chunkSize = 2000; // Define chunk size
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

  return translatedChunks;
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
      // Return existing translation
      return new Response(JSON.stringify({ translation: data.translation, source: 'supabase', requestData: { articleId, srcLanguage, targetLanguage, htmlContent: cleanedHtmlContent } }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    console.log('Translation not found in Supabase, using ChatGPT');

    // If translation doesn't exist, use ChatGPT to translate
    const translatedChunks = await translateLongHtmlContent(cleanedHtmlContent, srcLanguage, targetLanguage, gptModel);

    // Store each chunk in the temp_translations table
    const chunkPromises = translatedChunks.map((chunk, index) => {
      return supabase
        .from('temp_translations')
        .insert([
          { article_id: articleId, src_language: srcLanguage, target_language: targetLanguage, chunk_index: index, translation_chunk: chunk, last_updated: lastUpdated }
        ]);
    });
    await Promise.all(chunkPromises);

    // Fetch all chunks from temp_translations and stitch them together
    const { data: tempData, error: tempError } = await supabase
      .from('temp_translations')
      .select('*')
      .eq('article_id', articleId)
      .eq('src_language', srcLanguage)
      .eq('target_language', targetLanguage)
      .order('chunk_index', { ascending: true });

    if (tempError) {
      console.error(`Supabase temp fetch error: ${tempError.message}`);
      console.error(`Supabase temp fetch error details: ${JSON.stringify(tempError, null, 2)}`);
      throw new Error(`Supabase temp fetch error: ${tempError.message}`);
    }

    const finalTranslation = tempData.map(chunk => chunk.translation_chunk).join('');

    // Store the final translation in the translations table
    const { error: insertError } = await supabase
      .from('translations')
      .insert([
        { article_id: articleId, src_language: srcLanguage, target_language: targetLanguage, translation: finalTranslation, gpt_model: gptModel, last_updated: lastUpdated }
      ]);

    if (insertError) {
      console.error(`Supabase insert error: ${insertError.message}`);
      console.error(`Supabase insert error details: ${JSON.stringify(insertError, null, 2)}`);
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    // Clean up temp_translations table
    const { error: deleteError } = await supabase
      .from('temp_translations')
      .delete()
      .eq('article_id', articleId)
      .eq('src_language', srcLanguage)
      .eq('target_language', targetLanguage);

    if (deleteError) {
      console.error(`Supabase delete error: ${deleteError.message}`);
      console.error(`Supabase delete error details: ${JSON.stringify(deleteError, null, 2)}`);
      throw new Error(`Supabase delete error: ${deleteError.message}`);
    }

    console.log('Translation successful and stored in Supabase');
    // Return the new translation
    return new Response(JSON.stringify({ translation: finalTranslation, source: 'chatgpt', requestData: { articleId, srcLanguage, targetLanguage, htmlContent: cleanedHtmlContent } }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
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