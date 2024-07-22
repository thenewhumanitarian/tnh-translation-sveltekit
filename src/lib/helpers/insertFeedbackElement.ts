import { JSDOM } from 'jsdom';

const FEEDBACK_ELEMENT_PARAGRAPH_OFFSET = 5;

const FEEDBACK_TEXT = {
  'en': {
    'title': 'How would you rate the quality of the translation of this article?',
    'confirmation': 'Thanks for your feedback!',
    'submit': 'Submit rating'
  },
  'de': {
    'title': 'Wie bewerten Sie die Qualität der Übersetzung dieses Artikels?',
    'confirmation': 'Danke für Ihr Feedback!',
    'submit': 'Bewertung abgeben'
  },
  'es': {
    'title': '¿Cómo calificaría la calidad de la traducción de este artículo?',
    'confirmation': '¡Gracias por sus comentarios!',
    'submit': 'Enviar calificación'
  },
  'fr': {
    'title': 'Comment évalueriez-vous la qualité de la traduction de cet article?',
    'confirmation': 'Merci pour vos commentaires!',
    'submit': 'Soumettre la note'
  },
  'it': {
    'title': 'Come valuterebbe la qualità della traduzione di questo articolo?',
    'confirmation': 'Grazie per il tuo feedback!',
    'submit': 'Invia valutazione'
  },
  'ar': {
    'title': 'كيف تقيم جودة ترجمة هذا المقال؟',
    'confirmation': 'شكرا لملاحظاتك!',
    'submit': 'إرسال التقييم'
  },
  'ht': {
    'title': 'Ki jan ou ta evalye kalite tradiksyon atik sa a?',
    'confirmation': 'Mèsi pou fidbak ou!',
    'submit': 'Voye evalyasyon'
  },
  'hi': {
    'title': 'इस लेख के अनुवाद की गुणवत्ता को आप कैसे रेट करेंगे?',
    'confirmation': 'आपकी प्रतिक्रिया के लिए धन्यवाद!',
    'submit': 'रेटिंग सबमिट करें'
  },
  'zh-CN': {
    'title': '您如何评价本文的翻译质量？',
    'confirmation': '感谢您的反馈！',
    'submit': '提交评分'
  },
  'zh-TW': {
    'title': '您如何評價本文的翻譯品質？',
    'confirmation': '感謝您的回饋！ ',
    '提交': '提交評分'
  }
};

export function insertFeedbackElement(html: string, translationId: string, accessId: string, targetLanguage: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const feedbackText = FEEDBACK_TEXT[targetLanguage] || FEEDBACK_TEXT['en'];

  const feedbackElementHtml = `
    <div class="translation-feedback--wrapper" data-translation-id="${translationId}" data-access-id="${accessId}" data-target-language="${targetLanguage}">
      <p class="translation-feedback--title">${feedbackText.title}</p>
      <p class="translation-feedback--confirmation">${feedbackText.confirmation}</p>
      <div class="translation-feedback--stars">
        <span class="translation-feedback--star" data-rating="1">★</span>
        <span class="translation-feedback--star" data-rating="2">★</span>
        <span class="translation-feedback--star" data-rating="3">★</span>
        <span class="translation-feedback--star" data-rating="4">★</span>
        <span class="translation-feedback--star" data-rating="5">★</span>
      </div>
      <button class="translation-feedback--button submit-rating button button--primary">${feedbackText.submit}</button>
    </div>
  `;

  // Select the main article's .field-name-body.flow by checking its parent element to ensure it's not inside .article__series-item
  const fieldNameBodyFlow = Array.from(document.querySelectorAll('.field-name-body.flow'))
    .find(el => !el.closest('.article__series-item'));

  if (fieldNameBodyFlow) {
    // Remove any existing feedback elements
    const existingFeedbackElement = fieldNameBodyFlow.querySelector('.translation-feedback--wrapper');
    if (existingFeedbackElement) {
      existingFeedbackElement.remove();
    }

    const paragraphs = fieldNameBodyFlow.querySelectorAll('p');
    if (paragraphs.length >= FEEDBACK_ELEMENT_PARAGRAPH_OFFSET) {
      paragraphs[FEEDBACK_ELEMENT_PARAGRAPH_OFFSET - 1].insertAdjacentHTML('afterend', feedbackElementHtml);
    } else {
      fieldNameBodyFlow.insertAdjacentHTML('beforeend', feedbackElementHtml);
    }
  }

  return dom.serialize();
}