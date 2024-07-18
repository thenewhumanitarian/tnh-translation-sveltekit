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

  function createDropdownAndButton() {
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

    const container = document.createElement('div');
    container.id = 'dropdown-container';
    container.style.marginBottom = '1em';
    container.style.display = 'flex';
    container.style.gap = '1rem';
    container.style.width = '100%';
    container.style.justifyContent = 'end';
    container.style.alignItems = 'center';
    container.appendChild(dropdown);
    container.appendChild(translateButton);

    return container;
  }

  function prependDropdownAndButton() {
    const articleBodyElement = document.querySelector('.article__body');
    if (articleBodyElement) {
      const existingContainer = document.getElementById('dropdown-container');
      if (existingContainer) {
        existingContainer.remove();
      }

      const container = createDropdownAndButton();
      articleBodyElement.prepend(container);
      console.log("Dropdown and button added to the .article__body.");
    } else {
      console.error('.article__body element not found.');
    }
  }

  const articleElement = document.querySelector('article');
  if (articleElement) {
    window.originalBody = articleElement.innerHTML;
    console.log("Original content stored.");
  } else {
    console.error('Article element not found.');
  }

  function splitHtmlIntoChunks(html, chunkSize) {
    const chunks = [];
    let currentChunk = '';
    const regex = /(<\/?[^>]+>)/g;
    let lastIndex = 0;

    html.replace(regex, (match, tag, index) => {
      const textPart = html.substring(lastIndex, index);
      if (currentChunk.length + textPart.length > chunkSize) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      currentChunk += textPart;
      if (currentChunk.length + match.length > chunkSize) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      currentChunk += match;
      lastIndex = index + match.length;
    });

    const remainingText = html.substring(lastIndex);
    if (remainingText.length > 0) {
      if (currentChunk.length + remainingText.length > chunkSize) {
        chunks.push(currentChunk);
        chunks.push(remainingText);
      } else {
        currentChunk += remainingText;
        chunks.push(currentChunk);
      }
    } else if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
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

    const originalBody = window.originalBody;
    const chunks = splitHtmlIntoChunks(originalBody, 2000);

    try {
      for (let i = 0; i < chunks.length; i++) {
        const payload = {
          articleId: nodeId,
          targetLanguage: targetLanguage,
          htmlContent: chunks[i],
          password: 'tnh',
          lastUpdated: lastUpdated,
          chunkIndex: i,
          totalChunks: chunks.length
        };

        const response = await fetch('https://tnh-translation.vercel.app/api/translate-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Failed to fetch translation');
        }

        const data = await response.json();
        console.log(`Chunk ${i + 1}/${chunks.length} translated.`);
      }

      const finalResponse = await fetch(`https://tnh-translation.vercel.app/api/translate-html-finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: nodeId, targetLanguage: targetLanguage })
      });

      if (!finalResponse.ok) {
        throw new Error('Failed to finalize translation');
      }

      const finalData = await finalResponse.json();
      console.log('Final translation response:', finalData);

      // Replace the content of the article with the translated content
      articleElement.innerHTML = finalData.translation;

      // Re-add the dropdown and button to the translated content
      prependDropdownAndButton();
    } catch (error) {
      console.error('Error during translation process:', error);
    }
  }

  prependDropdownAndButton();
});