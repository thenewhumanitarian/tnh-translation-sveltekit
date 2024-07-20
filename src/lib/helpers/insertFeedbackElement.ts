import { JSDOM } from 'jsdom';

const FEEDBACK_ELEMENT_PARAGRAPH_OFFSET = 5;

export function insertFeedbackElement(html: string, translationId: string, accessId: string, targetLanguage: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const feedbackElementHtml = `
    <div class="feedback-element" style="margin: 3rem auto; text-align: center; background: #eee; padding: 2rem;">
      <p style="font-weight: bold;">Translation Feedback Element</p>
      <pre style="margin: 0;">Translation ID: ${translationId}</pre>
      <pre style="margin: 0;">Access ID: ${accessId}</pre>
      <pre style="margin: 0;">Target Language: ${targetLanguage}</pre>
    </div>
  `;

  const fieldNameBodyFlow = document.querySelector('.article__content .field-name-body.flow');
  if (fieldNameBodyFlow) {
    console.log("Found .field-name-body.flow element.");

    // Remove any existing feedback elements
    const existingFeedbackElement = fieldNameBodyFlow.querySelector('.feedback-element');
    if (existingFeedbackElement) {
      existingFeedbackElement.remove();
    }

    const paragraphs = fieldNameBodyFlow.querySelectorAll('p');
    console.log(`Found ${paragraphs.length} paragraphs inside .field-name-body.flow element.`);

    if (paragraphs.length >= FEEDBACK_ELEMENT_PARAGRAPH_OFFSET) {
      paragraphs[FEEDBACK_ELEMENT_PARAGRAPH_OFFSET - 1].insertAdjacentHTML('afterend', feedbackElementHtml);
      console.log("Inserted feedback element after the specified paragraph offset.");
    } else {
      fieldNameBodyFlow.insertAdjacentHTML('beforeend', feedbackElementHtml);
      console.log("Inserted feedback element at the end of .field-name-body.flow element.");
    }
  } else {
    console.error(".field-name-body.flow element not found.");
  }

  return dom.serialize();
}