document.addEventListener("DOMContentLoaded", () => {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'it', name: 'Italian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ht', name: 'Creole' }
    // Add more languages as needed
  ];

  // Create dropdown menu
  const dropdown = document.createElement('select');
  dropdown.id = 'language-dropdown';
  languages.forEach(language => {
    const option = document.createElement('option');
    option.value = language.code;
    option.textContent = language.name;
    dropdown.appendChild(option);
  });

  // Create translate button
  const translateButton = document.createElement('button');
  translateButton.textContent = 'Translate';
  translateButton.addEventListener('click', handleTranslation);

  // Prepend the dropdown and button to the body
  const container = document.createElement('div');
  container.style.marginBottom = '1em';
  container.appendChild(dropdown);
  container.appendChild(translateButton);
  document.body.prepend(container);

  // Store the original content of the <article> tag
  const articleElement = document.querySelector('article');
  if (articleElement) {
    window.originalBody = articleElement.innerHTML;
  }

  async function handleTranslation() {
    const targetLanguage = document.getElementById('language-dropdown').value;
    const articleElement = document.querySelector('article');

    if (!articleElement) {
      console.error('Article element not found.');
      return;
    }

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
      const response = await fetch('https://tnh-translation.vercel.app/api/translate-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch translation');
      }

      const data = await response.json();
      console.log('Translation response:', data);

      // Replace the content of the article with the translated content
      articleElement.innerHTML = data.translation;
    } catch (error) {
      console.error('Error during translation process:', error);
    }
  }
});