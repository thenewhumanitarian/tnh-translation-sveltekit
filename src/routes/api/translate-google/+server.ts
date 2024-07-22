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
    const { articleId, srcLanguage = 'en', targetLanguage, htmlContent, password, lastUpdated, accessIds: userAccessIds, allowTranslationReview } = await request.json();
    const referer = request.headers.get('referer');

    // List of allowed referers
    const allowedReferers = ['platformsh.site', 'thenewhumanitarian.org', 'thenewhumanitarian.org.ddev.site'];

    const isAllowedReferer = allowedReferers.some(allowedReferer => referer && referer.includes(allowedReferer));

    if (!isAllowedReferer && password !== PASSWORD) {
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

    let accessId;
    let source = 'google_translate';

    if (data) {
      console.log('Translation found in Supabase');
      accessId = await logAccess('supabase', articleId, srcLanguage, targetLanguage);
      source = 'supabase';

      // Check if any of the provided accessIds has a rating
      const { data: ratingData, error: ratingError } = await supabase
        .from('translation_ratings')
        .select('access_id')
        .in('access_id', userAccessIds);

      if (ratingError) {
        console.error(`Supabase rating error: ${ratingError.message}`);
        console.error(`Supabase rating error details: ${JSON.stringify(ratingError, null, 2)}`);
        throw new Error(`Supabase rating error: ${ratingError.message}`);
      }

      let translation = data.translation;
      translation = removeUnwantedSpaces(translation);
      translation = fixLinkPunctuation(translation);

      if (allowTranslationReview) {
        if (ratingData.length > 0) {
          // An accessId with a rating exists
          translation = insertFeedbackElement(translation, 'rated');
        } else {
          // No accessId with a rating exists
          translation = insertFeedbackElement(translation, 'not_rated');
        }
      }

      return new Response(JSON.stringify({ translation, accessId, source }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
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

    accessId = await logAccess('google_translate', articleId, srcLanguage, targetLanguage);

    let cleanedTranslation = removeUnwantedSpaces(translation);
    cleanedTranslation = fixLinkPunctuation(cleanedTranslation);

    if (allowTranslationReview) {
      cleanedTranslation = insertFeedbackElement(cleanedTranslation, 'not_rated');
    }

    console.log('Translation successful and stored in Supabase');
    return new Response(JSON.stringify({ translation: cleanedTranslation, accessId, source }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
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