// /api/translation-status.js
import { supabase } from '$lib/supabaseClient';

export const POST = async (req, res) => {
  const { articleId, srcLanguage = 'en', targetLanguage, lastUpdated } = req.body;

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
      return res.status(200).json({ translation: data.translation, source: 'supabase' });
    } else {
      return res.status(202).json({ status: 'Processing' });
    }

  } catch (error) {
    console.error(`Error checking translation status: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};