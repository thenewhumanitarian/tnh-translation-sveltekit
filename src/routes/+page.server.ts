import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import openai from '$lib/openaiClient';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, srcLanguage, targetLanguage, htmlContent } = await request.json();

    console.log(`Received request to translate articleId: ${articleId} from ${srcLanguage} to ${targetLanguage}`);

    // Check if translation exists in Supabase by matching the original string
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('original_string', htmlContent)
      .eq('src_language', srcLanguage)
      .eq('target_language', targetLanguage)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
      console.error(`Supabase error: ${error.message}`);
      console.error(`Supabase error details: ${JSON.stringify(error, null, 2)}`);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (data) {
      console.log('Translation found in Supabase');
      // Return existing translation
      return new Response(JSON.stringify({ translation: data.translation, source: 'supabase' }), { status: 200 });
    }

    console.log('Translation not found in Supabase, using ChatGPT');

    // If translation doesn't exist, use ChatGPT to translate
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: `Translate the following HTML from ${srcLanguage} to ${targetLanguage}, preserving the HTML tags:\n\n${htmlContent}` }],
      model: 'gpt-3.5-turbo'
    });

    const translatedHtml = chatCompletion.choices[0].message.content;

    // Store the new translation in Supabase
    const { error: insertError } = await supabase
      .from('translations')
      .insert([
        { article_id: articleId, original_string: htmlContent, src_language: srcLanguage, target_language: targetLanguage, translation: translatedHtml }
      ]);

    if (insertError) {
      console.error(`Supabase insert error: ${insertError.message}`);
      console.error(`Supabase insert error details: ${JSON.stringify(insertError, null, 2)}`);
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    console.log('Translation successful and stored in Supabase');
    // Return the new translation
    return new Response(JSON.stringify({ translation: translatedHtml, source: 'chatgpt' }), { status: 200 });
  } catch (error) {
    console.error(`Error during translation process: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};