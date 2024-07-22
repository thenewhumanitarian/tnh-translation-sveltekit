import type { RequestHandler } from '@sveltejs/kit';
import { PASSWORD } from '$env/static/private';
import { supabase } from '$lib/clients/supabaseClient';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { articleId, targetLanguage, rating, translationId, accessId } = await request.json();

    const referer = request.headers.get('referer');

    // List of allowed referers
    const allowedReferers = ['platformsh.site', 'thenewhumanitarian.org', 'thenewhumanitarian.org.ddev.site'];

    const isAllowedReferer = allowedReferers.some(allowedReferer => referer && referer.includes(allowedReferer));

    if (!isAllowedReferer && PASSWORD !== PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Insert rating into the database
    const { error } = await supabase
      .from('translation_ratings')
      .insert([{ article_id: articleId, target_language: targetLanguage, rating, translation_id: translationId, access_id: accessId }]);

    if (error) {
      console.error(`Supabase insert error: ${error.message}`);
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    // Return success response
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow any origin
        'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS methods
        'Access-Control-Allow-Headers': 'Content-Type', // Allow Content-Type header
      }
    });
  } catch (error) {
    console.error(`Error during rating submission: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow any origin
        'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS methods
        'Access-Control-Allow-Headers': 'Content-Type', // Allow Content-Type header
      }
    });
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Allow any origin
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', // Allow POST, GET and OPTIONS methods
      'Access-Control-Allow-Headers': 'Content-Type' // Allow Content-Type header
    }
  });
};