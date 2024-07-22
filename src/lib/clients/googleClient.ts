/* V2 */

// import { Translate } from '@google-cloud/translate/build/src/v2';
// import { GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '$env/static/private';

// // Replace \\n with \n to format the private key correctly
// const formattedPrivateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

// const translate = new Translate({
//   projectId: GOOGLE_PROJECT_ID,
//   credentials: {
//     client_email: GOOGLE_CLIENT_EMAIL,
//     private_key: formattedPrivateKey,
//   },
// });

// export default translate;

/* V3 */

import { Translate } from '@google-cloud/translate/build/src/v2';
import { GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_LOCATION } from '$env/static/private';

// Replace \\n with \n to format the private key correctly
const formattedPrivateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const translate = new Translate({
  projectId: GOOGLE_PROJECT_ID,
  credentials: {
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: formattedPrivateKey,
  },
});

export async function translateText(
  text: string,
  sourceLanguageCode: string,
  targetLanguageCode: string,
  model: string = 'general/nmt'
): Promise<string> {
  const request = {
    parent: `projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}`,
    contents: [text],
    mimeType: 'text/html', // mime types: text/plain, text/html
    sourceLanguageCode,
    targetLanguageCode,
    model: `projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/models/${model}`,
  };

  try {
    const [response] = await translate.translateText(request);
    return response.translations.map(t => t.translatedText).join('');
  } catch (error) {
    console.error(`Error during translation: ${error.message}`);
    throw new Error(`Translation failed: ${error.message}`);
  }
}