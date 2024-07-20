import type { RequestHandler } from '@sveltejs/kit';
import { PASSWORD } from '$env/static/private';
import { supabase } from '$lib/clients/supabaseClient';
import translate from '$lib/clients/googleClient';
import { cleanHtml } from '$lib/helpers/cleanHtml';
import { removeUnwantedSpaces } from '$lib/helpers/removeUnwantedSpaces';
import { fixLinkPunctuation } from '$lib/helpers/fixLinkPunctuation';
import { insertFeedbackElement } from '$lib/helpers/insertFeedbackElement';
import { logAccess } from '$lib/helpers/logAccess';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, srcLanguage = 'en', targetLanguage, htmlContent, password, lastUpdated, scriptPosition } = await request.json();
    const referer = request.headers.get('referer');

    const allowedReferers = ['platformsh.site', 'thenewhumanitarian.org'];

    const isAllowedReferer = allowedReferers.some(allowedReferer => referer && referer.includes(allowedReferer));

    if (!isAllowedReferer && password !== PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const cleanedHtmlContent = cleanHtml(htmlContent);

    console.log(`Received request to translate articleId: ${articleId} from ${srcLanguage} to ${targetLanguage}`);

    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('article_id', articleId)
      .eq('src_language', srcLanguage)
      .eq('target_language', targetLanguage)
      .eq('last_updated', lastUpdated)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Supabase error: ${error.message}`);
      console.error(`Supabase error details: ${JSON.stringify(error, null, 2)}`);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (data) {
      console.log('Translation found in Supabase');
      await logAccess('supabase', articleId, srcLanguage, targetLanguage);

      let translation = data.translation;
      translation = removeUnwantedSpaces(translation);
      translation = fixLinkPunctuation(translation);

      // Insert feedback element
      translation = insertFeedbackElement(translation, data.id);

      return new Response(JSON.stringify({ translation, translationId: data.id, source: 'supabase' }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    console.log('Translation not found in Supabase, using Google Translate');

    const [translation] = await translate.translate(cleanedHtmlContent, {
      from: srcLanguage,
      to: targetLanguage,
      format: 'html'
    });

    console.log('Translation received from Google Translate:', translation);

    let cleanedTranslation = removeUnwantedSpaces(translation);
    cleanedTranslation = fixLinkPunctuation(cleanedTranslation);

    const { data: newTranslation, error: insertError } = await supabase
      .from('translations')
      .insert([
        { article_id: articleId, src_language: srcLanguage, target_language: targetLanguage, translation: cleanedTranslation, original_string: cleanedHtmlContent, gpt_model: 'google_translate', last_updated: lastUpdated || new Date().toISOString() }
      ])
      .select('id')
      .single();

    if (insertError) {
      console.error(`Supabase insert error: ${insertError.message}`);
      console.error(`Supabase insert error details: ${JSON.stringify(insertError, null, 2)}`);
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    await logAccess('google_translate', articleId, srcLanguage, targetLanguage);

    // Insert feedback element
    cleanedTranslation = insertFeedbackElement(cleanedTranslation, newTranslation.id);

    console.log('Translation successful and stored in Supabase');
    return new Response(JSON.stringify({ translation: cleanedTranslation, translationId: newTranslation.id, source: 'google_translate' }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
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