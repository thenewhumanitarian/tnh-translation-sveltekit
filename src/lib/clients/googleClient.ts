/* V2 */

import { Translate } from '@google-cloud/translate/build/src/v2';
import { GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from '$env/static/private';

// Replace \\n with \n to format the private key correctly
const formattedPrivateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const translate = new Translate({
  projectId: GOOGLE_PROJECT_ID,
  credentials: {
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: formattedPrivateKey,
  },
});

export default translate;