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
    console.error('Article element not found.');
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
    const articleElement = document.querySelector('article');
    const dropdown = document.getElementById('language-dropdown');
    const translateButton = document.querySelector('button');
    const loadingMessage = document.getElementById('loading-message');

    if (!articleElement) {
      console.error('Article element not found.');
      return;
    }

    dropdown.disabled = true;
    translateButton.disabled = true;
    translateButton.style.display = 'none';
    loadingMessage.style.display = 'block';

    const nodeId = document.querySelector('link[rel="shortlink"]').href.split('/').pop();
    const lastUpdated = document.querySelector('meta[property="article:modified_time"]').content;

    const payload = {
      articleId: nodeId,
      targetLanguage: targetLanguage,
      htmlContent: window.originalBody,
      password: 'tnh',
      lastUpdated: lastUpdated
    };

    try {
      await fetch('/api/translate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Polling for translation status
      let translationComplete = false;
      while (!translationComplete) {
        const statusPayload = {
          articleId: nodeId,
          targetLanguage: targetLanguage,
          lastUpdated: lastUpdated
        };

        const response = await fetch('/api/translation-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(statusPayload)
        });

        const { status, translation } = await response.json();

        if (response.status === 200 && translation) {
          console.log('Translation complete:', translation);
          articleElement.innerHTML = translation;
          translationComplete = true;
        } else if (response.status === 202) {
          console.log('Translation in progress...');
          await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        } else {
          console.error('Error checking translation status:', status);
          alert('Error translating content. Please try again later.');
          translationComplete = true; // Exit polling loop on error
        }
      }

      dropdown.disabled = false;
      translateButton.disabled = false;
      translateButton.style.display = 'block';
      loadingMessage.style.display = 'none';

    } catch (error) {
      console.error('Error translating content:', error.message);
      alert('Error translating content. Please try again later.');
      dropdown.disabled = false;
      translateButton.disabled = false;
      translateButton.style.display = 'block';
      loadingMessage.style.display = 'none';
    }
  }
};