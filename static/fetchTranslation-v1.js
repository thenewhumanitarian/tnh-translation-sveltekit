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
    // Add more languages as needed
  ];

  // Create dropdown menu
  const dropdown = document.createElement('select');
  dropdown.id = 'language-dropdown';
  dropdown.style.width = '100%';
  languages.forEach(language => {
    const option = document.createElement('option');
    option.value = language.code;
    option.textContent = language.name;
    dropdown.appendChild(option);
  });

  // Create translate button
  const translateButton = document.createElement('button');
  translateButton.textContent = 'Translate';
  translateButton.style.padding = '0.8rem';
  translateButton.style.cursor = 'pointer';
  translateButton.addEventListener('click', handleTranslation);

  // Create a container for the dropdown and button
  const container = document.createElement('div');
  container.style.marginBottom = '1em';
  container.style.display = 'flex';
  container.style.gap = '1rem';
  container.style.width = '100';
  container.style.justifyContent = 'end';
  container.style.alignItems = 'center';
  container.appendChild(dropdown);
  container.appendChild(translateButton);

  // Prepend the container to the .article__body element
  const articleBodyElement = document.querySelector('.article__body');
  if (articleBodyElement) {
    articleBodyElement.prepend(container);
    console.log("Dropdown and button added to the .article__body.");
  } else {
    console.error('.article__body element not found.');
    return;
  }

  // Store the original content of the <article> tag
  const articleElement = document.querySelector('article');
  if (articleElement) {
    window.originalBody = articleElement.innerHTML;
    console.log("Original content stored.");
  } else {
    console.error('Article element not found.');
  }

  async function handleTranslation() {
    console.log("Translate button clicked.");

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