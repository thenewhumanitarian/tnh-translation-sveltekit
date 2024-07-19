import { Translate } from '@google-cloud/translate/build/src/v2';
import { GOOGLE_PROJECT_ID, GOOGLE_KEYFILE_PATH } from '$env/static/private';

const translate = new Translate({
  projectId: GOOGLE_PROJECT_ID,
  keyFilename: GOOGLE_KEYFILE_PATH
});

export async function translateText(text: string, targetLanguage: string) {
  const [translation] = await translate.translate(text, targetLanguage);
  return translation;
}