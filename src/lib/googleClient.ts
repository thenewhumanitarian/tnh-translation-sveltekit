import { Translate } from '@google-cloud/translate/build/src/v2';
import { GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '$env/static/private';

// Configure the Google Cloud client with environment variables
const translate = new Translate({
  projectId: GOOGLE_PROJECT_ID,
  credentials: {
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensure the private key is correctly formatted
  },
});

async function translateText(text: string, targetLanguage: string): Promise<string> {
  const [translations] = await translate.translate(text, targetLanguage);
  return Array.isArray(translations) ? translations[0] : translations;
}

export { translateText };