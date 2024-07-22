import { JSDOM } from 'jsdom';
import { supabase } from '$lib/clients/supabaseClient';

const FEEDBACK_ELEMENT_PARAGRAPH_OFFSET = 5;

export async function insertFeedbackElement(html: string, translationId: string, accessId: string, articleId: string, targetLanguage: string): Promise<string> {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Check if this access ID has already been rated
  const { data: ratingData, error } = await supabase
    .from('translation_ratings')
    .select('rating')
    .eq('access_id', accessId)
    .single();

  let feedbackElementHtml;

  if (error || !ratingData) {
    // Feedback element with rating form
    feedbackElementHtml = `
      <div class="feedback-element" style="margin: 3rem auto; text-align: center; background: #eee; padding: 2rem;">
        <p style="font-weight: bold;">How happy are you with the translation of this article so far?</p>
        <div class="star-rating">
          <span data-value="1">&#9733;</span>
          <span data-value="2">&#9733;</span>
          <span data-value="3">&#9733;</span>
          <span data-value="4">&#9733;</span>
          <span data-value="5">&#9733;</span>
        </div>
        <button id="submit-rating" data-translation-id="${translationId}" data-access-id="${accessId}" data-article-id="${articleId}" data-target-language="${targetLanguage}" style="margin-top: 1rem;">Submit Rating</button>
      </div>
    `;
  } else {
    // Feedback element showing the rating
    feedbackElementHtml = `
      <div class="feedback-element" style="margin: 3rem auto; text-align: center; background: #eee; padding: 2rem;">
        <p style="font-weight: bold;">You rated this translation with ${ratingData.rating} stars.</p>
      </div>
    `;
  }

  // Select the main article's .field-name-body.flow by checking its parent element to ensure it's not inside .article__series-item
  const fieldNameBodyFlow = Array.from(document.querySelectorAll('.field-name-body.flow'))
    .find(el => !el.closest('.article__series-item'));

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