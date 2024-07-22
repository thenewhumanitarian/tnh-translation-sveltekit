import * as deepl from 'deepl-node';
import { DEEPL_API_KEY } from '$env/static/private';

// Initialize the DeepL Translator with the API key
const translator = new deepl.Translator(DEEPL_API_KEY);

/**
 * Translate text using DeepL
 * @param text - The text to translate
 * @param sourceLang - The source language code (optional)
 * @param targetLang - The target language code
 * @returns The translated text
 */
export async function translateText(text: string, sourceLang: string | null, targetLang: string): Promise<string> {
  try {
    const result = await translator.translateText(text, sourceLang, targetLang);
    return result.text;
  } catch (error) {
    console.error('Error translating text with DeepL:', error);
    throw error;
  }
}