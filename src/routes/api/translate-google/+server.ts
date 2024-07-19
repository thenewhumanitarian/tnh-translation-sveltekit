import type { RequestHandler } from '@sveltejs/kit';
import { PASSWORD } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';
import translate from '$lib/googleClient';

function cleanHtml(html: string): string {
  let cleanedHtml = html.replace(/ dir="ltr"/g, '');
  cleanedHtml = cleanedHtml.replace(/<div id="mct-script"><\/div>/g, '');
  return cleanedHtml;
}

function extractElements(html: string, ignoreClasses: string[]): { cleanedHtml: string, extractedElements: { [key: string]: string } } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const extractedElements: { [key: string]: string } = {};

  ignoreClasses.forEach(className => {
    const elements = doc.querySelectorAll(`.${className}`);
    elements.forEach((el, index) => {
      const placeholder = `<!-- ${className}_${index} -->`;
      extractedElements[placeholder] = el.outerHTML;
      el.outerHTML = placeholder;
    });
  });

  return { cleanedHtml: doc.body.innerHTML, extractedElements };
}

function reinsertElements(translatedHtml: string, extractedElements: { [key: string]: string }): string {
  let resultHtml = translatedHtml;
  Object.keys(extractedElements).forEach(placeholder => {
    resultHtml = resultHtml.replace(placeholder, extractedElements[placeholder]);
  });
  return resultHtml;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, srcLanguage = 'en', targetLanguage, htmlContent, password, lastUpdated, ignoreClasses = [] } = await request.json();

    if (password !== PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const cleanedHtmlContent = cleanHtml(htmlContent);

    console.log(`Received request to translate articleId: ${articleId} from ${srcLanguage} to ${targetLanguage}`);

    // Extract elements to ignore from the HTML content
    const { cleanedHtml, extractedElements } = extractElements(cleanedHtmlContent, ignoreClasses);

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

    console.log('Translation not found in Supabase, using Google Translate');

    // Translate the cleaned HTML content
    const [translation] = await translate.translate(cleanedHtml, {
      from: srcLanguage,
      to: targetLanguage,
      format: 'html'
    });

    // Reinsert ignored elements back into the translated HTML content
    const finalTranslation = reinsertElements(translation, extractedElements);

    // Log original string to ensure it's correct
    console.log('Original String:', cleanedHtmlContent);

    // Store the final translation in the translations table
    const { error: insertError } = await supabase
      .from('translations')
      .insert([
        {
          article_id: articleId,
          src_language: srcLanguage,
          target_language: targetLanguage,
          translation: finalTranslation,
          original_string: cleanedHtmlContent,
          gpt_model: 'google_translate',
          last_updated: lastUpdated
        }
      ]);

    if (insertError) {
      console.error(`Supabase insert error: ${insertError.message}`);
      console.error(`Supabase insert error details: ${JSON.stringify(insertError, null, 2)}`);
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    console.log('Translation successful and stored in Supabase');
    // Return the new translation with direction
    const dir = targetLanguage === 'ar' ? 'rtl' : 'ltr';
    const translationWithDir = `<article dir="${dir}">${finalTranslation}</article>`;
    return new Response(JSON.stringify({ translation: translationWithDir, source: 'google_translate' }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
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