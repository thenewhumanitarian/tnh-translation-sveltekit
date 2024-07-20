import { supabase } from '$lib/clients/supabaseClient';

export async function logAccess(source: string, articleId: string, srcLang: string, targetLang: string) {
  const { error } = await supabase
    .from('access_logs')
    .insert([
      { source, article_id: articleId, src_language: srcLang, target_language: targetLang, timestamp: new Date().toISOString() }
    ]);

  if (error) {
    console.error(`Error logging access: ${error.message}`);
  }
}