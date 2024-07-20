import { JSDOM } from 'jsdom';

const FEEDBACK_ELEMENT_PARAGRAPH_OFFSET = 5;

export function insertFeedbackElement(html: string, translationId: string, accessId: string, targetLanguage: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const feedbackElementHtml = `
    <div class="feedback-element" style="margin: 3rem auto; text-align: center; background: #eee; padding: 2rem;">
      <p style="font: bold;">Translation Feedback Element</p>
      <pre style="margin: 0;">Translation ID: ${translationId}</pre>
      <pre style="margin: 0;">Access ID: ${accessId}</pre>
      <pre style="margin: 0;">Target Language: ${targetLanguage}</pre>
    </div>
  `;

  const fieldNameBodyFlow = document.querySelector('.field-name-body.flow');
  if (fieldNameBodyFlow) {
    // Remove any existing feedback elements
    const existingFeedbackElement = fieldNameBodyFlow.querySelector('.feedback-element');
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