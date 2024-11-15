import * as deepl from 'deepl-node';
import { env } from '$env/dynamic/private';

const DEEPL_API_KEY = env.DEEPL_API_KEY;

// Initialize the DeepL Translator with the API key
const translator = new deepl.Translator(DEEPL_API_KEY);

/**
 * Translate an array of texts using DeepL
 * @param texts - The array of texts to translate
 * @param sourceLang - The source language code (optional)
 * @param targetLang - The target language code
 * @returns The array of translated texts
 */
export async function translateTexts(
  texts: string[],
  sourceLang: string | null,
  targetLang: string
): Promise<string[]> {
  try {
    const results = await translator.translateText(texts, sourceLang, targetLang);
    return results.map(result => result.text);
  } catch (error) {
    console.error('Error translating texts with DeepL:', error);
    throw error;
  }
}