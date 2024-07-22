import { JSDOM } from 'jsdom';

const FEEDBACK_ELEMENT_PARAGRAPH_OFFSET = 5;

export function insertFeedbackElement(html: string, translationId: string, accessId: string, targetLanguage: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const feedbackElementHtml = `
    <div class="translation-feedback--wrapper" data-translation-id="${translationId}" data-access-id="${accessId}" data-target-language="${targetLanguage}" style="margin: 3rem auto; text-align: center; background: #eee; padding: 2rem;">
      <p class="translation-fedback--title">How happy are you with the translation of this article so far?</p>
      <div class="translation-feedback--stars">
        <span class="translation-feedback--star" data-rating="1">★</span>
        <span class="translation-feedback--star" data-rating="2">★</span>
        <span class="translation-feedback--star" data-rating="3">★</span>
        <span class="translation-feedback--star" data-rating="4">★</span>
        <span class="translation-feedback--star" data-rating="5">★</span>
      </div>
      <button class="translation-feedback--button submit-rating">Submit Rating</button>
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