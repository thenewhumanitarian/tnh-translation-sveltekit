import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const POST: RequestHandler = async ({ request }) => {
  const { articleId, srcLanguage = 'en', targetLanguage, lastUpdated } = await request.json();

  try {
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
      return new Response(JSON.stringify({ translation: data.translation, source: 'supabase' }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ status: 'Processing' }), { status: 202 });
    }

  } catch (error) {
    console.error(`Error checking translation status: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};