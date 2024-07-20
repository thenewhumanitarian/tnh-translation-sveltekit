import { JSDOM } from 'jsdom';

const FEEDBACK_ELEMENT_PARAGRAPH_OFFSET = 5;

export function insertFeedbackElement(html: string, scriptPosition?: number): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const fieldNameBodyFlow = document.querySelector('.field-name-body.flow');
  if (fieldNameBodyFlow) {
    const paragraphs = fieldNameBodyFlow.querySelectorAll('p');
    const feedbackElement = document.createElement('div');
    feedbackElement.setAttribute('style', 'margin: 3rem auto; text-align: center; background: #eee; padding: 2rem;');
    feedbackElement.innerHTML = '<p>Translation Feedback Element (placeholder)</p>';

    if (scriptPosition && paragraphs.length >= scriptPosition) {
      paragraphs[scriptPosition - 1].insertAdjacentElement('afterend', feedbackElement);
    } else if (paragraphs.length >= FEEDBACK_ELEMENT_PARAGRAPH_OFFSET) {
      paragraphs[FEEDBACK_ELEMENT_PARAGRAPH_OFFSET - 1].insertAdjacentElement('afterend', feedbackElement);
    } else {
      fieldNameBodyFlow.appendChild(feedbackElement);
    }
  }

  return dom.serialize();
}