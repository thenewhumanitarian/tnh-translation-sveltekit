import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/clients/supabaseClient';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { translationId, accessId, articleId, targetLanguage, rating } = await request.json();

    if (!translationId || !accessId || !articleId || !targetLanguage || !rating) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('translation_ratings')
      .insert([
        {
          translation_id: translationId,
          access_id: accessId,
          article_id: articleId,
          target_language: targetLanguage,
          rating: rating
        }
      ]);

    if (error) {
      console.error(`Supabase insert error: ${error.message}`);
      console.error(`Supabase insert error details: ${JSON.stringify(error, null, 2)}`);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Feedback submitted successfully', data }), { status: 200 });
  } catch (error) {
    console.error(`Error during feedback submission: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
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