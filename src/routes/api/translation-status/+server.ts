import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const articleId = url.searchParams.get('articleId');
    const targetLanguage = url.searchParams.get('targetLanguage');

    if (!articleId || !targetLanguage) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('article_id', articleId)
      .eq('target_language', targetLanguage)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
      console.error(`Supabase error: ${error.message}`);
      console.error(`Supabase error details: ${JSON.stringify(error, null, 2)}`);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data) {
      return new Response(JSON.stringify({ status: 'processing' }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return new Response(JSON.stringify({ status: 'completed', translation: data.translation }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    console.error(`Error during translation status check: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
};