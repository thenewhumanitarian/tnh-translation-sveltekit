import { Translate } from '@google-cloud/translate/build/src/v2';
import { GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '$env/static/private';

const translate = new Translate({
  projectId: GOOGLE_PROJECT_ID,
  credentials: {
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }
});

export async function translateText(text: string, targetLanguage: string) {
  const [translation] = await translate.translate(text, targetLanguage);
  return translation;
}