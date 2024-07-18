import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import openai from '$lib/openaiClient';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, srcLanguage, targetLanguage, htmlContent, gptModel = 'gpt-3.5-turbo' } = await request.json();
    const cleanedHtmlContent = htmlContent.replace(/ dir="ltr"/g, '');

    console.log(`Received request to translate articleId: ${articleId} from ${srcLanguage} to ${targetLanguage} using ${gptModel}`);

    // Check if translation exists in Supabase by matching the article ID and gpt_model
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('article_id', articleId)
      .eq('src_language', srcLanguage)
      .eq('target_language', targetLanguage)
      .eq('gpt_model', gptModel)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
      console.error(`Supabase error: ${error.message}`);
      console.error(`Supabase error details: ${JSON.stringify(error, null, 2)}`);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (data) {
      console.log('Translation found in Supabase');
      console.log(`Translation data: ${JSON.stringify(data)}`);
      // Return existing translation
      return new Response(JSON.stringify({ translation: data.translation, source: 'supabase', requestData: { articleId, srcLanguage, targetLanguage, htmlContent: cleanedHtmlContent, gptModel } }), { status: 200 });
    }

    console.log('Translation not found in Supabase, using ChatGPT');

    // If translation doesn't exist, use ChatGPT to translate
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: `Translate the following HTML from ${srcLanguage} to ${targetLanguage}, preserving the HTML tags:\n\n${cleanedHtmlContent}` }],
      model: gptModel
    });

    const translatedHtml = chatCompletion.choices[0].message.content;

    // Store the new translation in Supabase
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
    // Return the new translation
    return new Response(JSON.stringify({ translation: translatedHtml, source: 'chatgpt', requestData: { articleId, srcLanguage, targetLanguage, htmlContent: cleanedHtmlContent, gptModel } }), { status: 200 });
  } catch (error) {
    console.error(`Error during translation process: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};