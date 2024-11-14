document.addEventListener("DOMContentLoaded", () => {
  console.log("Document loaded. Initializing translation script.");

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'it', name: 'Italian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ht', name: 'Creole' }
  ];

  function createTranslationControls() {
    const dropdown = document.createElement('select');
    dropdown.id = 'language-dropdown';
    dropdown.style.width = '100%';
    languages.forEach(language => {
      const option = document.createElement('option');
      option.value = language.code;
      option.textContent = language.name;
      dropdown.appendChild(option);
    });

    const translateButton = document.createElement('button');
    translateButton.textContent = 'Translate';
    translateButton.classList.add('button--translate');
    translateButton.style.padding = '0.9rem';
    translateButton.style.cursor = 'pointer';
    translateButton.addEventListener('click', handleTranslation);

    const loadingMessage = document.createElement('span');
    loadingMessage.id = 'loading-message';
    loadingMessage.style.display = 'none';
    loadingMessage.textContent = 'Translating...';

    const container = document.createElement('div');
    container.style.marginBottom = '1em';
    container.style.display = 'flex';
    container.style.gap = '1rem';
    container.style.width = '100%';
    container.style.justifyContent = 'end';
    container.style.alignItems = 'center';
    container.appendChild(dropdown);
    container.appendChild(translateButton);
    container.appendChild(loadingMessage);

    return container;
  }

  const articleElement = document.querySelector('article');
  if (articleElement && !window.originalBody) {
    window.originalBody = articleElement.innerHTML;
    console.log("Original content stored.");
  } else if (!articleElement) {
    console.error('article element not found.');
  }

  const articleBodyElement = document.querySelector('.article__body');
  if (articleBodyElement) {
    articleBodyElement.prepend(createTranslationControls());
    console.log("Dropdown and button added to the .article__body.");
  } else {
    console.error('.article__body element not found.');
  }

  async function handleTranslation() {
    console.log("Translate button clicked.");

    const targetLanguage = document.getElementById('language-dropdown').value;
    const dropdown = document.getElementById('language-dropdown');
    const translateButton = document.querySelector('.button--translate');
    const loadingMessage = document.getElementById('loading-message');

    if (!articleElement) {
      console.error('.article__body element not found.');
      return;
    }

    // Disable dropdown and button, show loading message
    dropdown.disabled = true;
    translateButton.disabled = true;
    translateButton.style.display = 'none';
    loadingMessage.style.display = 'block';

    const nodeId = document.querySelector('link[rel="shortlink"]').href.split('/').pop();
    const lastUpdated = document.querySelector('meta[property="article:modified_time"]')?.content || null;

    const payload = {
      articleId: nodeId,
      targetLanguage: targetLanguage,
      htmlContent: window.originalBody,
      lastUpdated: lastUpdated
    };

    try {
      console.log("Sending translation request with payload:", payload);
      const response = await fetch('https://tnh-translation.vercel.app/api/translate-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch translation');
      }

      const data = await response.json();
      console.log('Translation response:', data);

      // Remove existing feedback element if it exists
      const existingFeedbackElement = articleElement.querySelector('.translation-feedback--wrapper');
      if (existingFeedbackElement) {
        existingFeedbackElement.remove();
      }

      // Replace the content of the .article__body with the translated content
      articleElement.innerHTML = data.translation;

      const articleBodyElement = document.querySelector('.article__body');

      // Recreate and prepend the translation controls
      const newContainer = createTranslationControls();
      articleBodyElement.prepend(newContainer);
    } catch (error) {
      console.error('Error during translation process:', error);
    } finally {
      // Re-enable dropdown and button, hide loading message
      dropdown.disabled = false;
      translateButton.disabled = false;
      translateButton.style.display = 'block';
      loadingMessage.style.display = 'none';
    }
  }
});