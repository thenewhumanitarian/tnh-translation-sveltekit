import { supabase } from '$lib/clients/supabaseClient';

export async function logAccess(source: string, articleId: string, srcLang: string, targetLang: string) {
  const { data, error } = await supabase
    .from('access_logs')
    .insert([
      { source, article_id: articleId, src_language: srcLang, target_language: targetLang, timestamp: new Date().toISOString() }
    ])
    .select('id')
    .single();

  if (error) {
    console.error(`Error logging access: ${error.message}`);
    throw error;
  }

  return data.id;
}