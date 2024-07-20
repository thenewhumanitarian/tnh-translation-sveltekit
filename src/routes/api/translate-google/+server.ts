import type { RequestHandler } from '@sveltejs/kit';
import { PASSWORD } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';
import translate from '$lib/googleClient';

function cleanHtml(html: string): string {
  let cleanedHtml = html.replace(/ dir="ltr"/g, '');
  cleanedHtml = cleanedHtml.replace(/<div id="mct-script"><\/div>/g, '');
  return cleanedHtml;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, srcLanguage = 'en', targetLanguage, htmlContent, password, lastUpdated } = await request.json();

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

    console.log('Translation not found in Supabase, using Google Translate');

    const [translation] = await translate.translate(cleanedHtmlContent, {
      from: srcLanguage,
      to: targetLanguage,
      format: 'html'
    });

    console.log('Translation received from Google Translate:', translation);

    // Store the final translation in the translations table
    const { error: insertError } = await supabase
      .from('translations')
      .insert([
        { article_id: articleId, src_language: srcLanguage, target_language: targetLanguage, translation, original_string: cleanedHtmlContent, gpt_model: 'google_translate', last_updated: lastUpdated }
      ]);

    if (insertError) {
      console.error(`Supabase insert error: ${insertError.message}`);
      console.error(`Supabase insert error details: ${JSON.stringify(insertError, null, 2)}`);
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    await logAccess('google_translate', articleId, srcLanguage, targetLanguage);

    console.log('Translation successful and stored in Supabase');
    // Return the new translation
    return new Response(JSON.stringify({ translation, source: 'google_translate' }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    console.error(`Error during translation process: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
};

async function logAccess(source: string, articleId: string, srcLang: string, targetLang: string) {
  const { error } = await supabase
    .from('access_logs')
    .insert([
      { source, article_id: articleId, src_language: srcLang, target_language: targetLang, timestamp: new Date().toISOString() }
    ]);

  if (error) {
    console.error(`Error logging access: ${error.message}`);
  }
}

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