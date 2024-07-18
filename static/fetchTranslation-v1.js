async function fetchTranslation() {
  const targetLanguage = 'de';
  const password = 'tnh';

  // Extract the node ID
  const linkElement = document.querySelector('link[rel="shortlink"]');
  if (!linkElement) {
    console.error('Node ID not found.');
    return;
  }
  const nodeIdMatch = linkElement.href.match(/node\/(\d+)/);
  if (!nodeIdMatch) {
    console.error('Node ID not found.');
    return;
  }
  const articleId = nodeIdMatch[1];

  // Select the HTML content
  const contentElement = document.querySelector('.field-name-body.flow');
  if (!contentElement) {
    console.error('Content element not found.');
    return;
  }
  const htmlContent = contentElement.innerHTML;

  // Prepare the payload
  const payload = {
    articleId,
    targetLanguage,
    htmlContent,
    password
  };

  try {
    // Make the request
    const response = await fetch('https://tnh-translation.vercel.app/api/translate-html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Handle the response
    if (!response.ok) {
      throw new Error(`Failed to fetch translation: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Translation response:', data);

    // Replace the content with the translated HTML
    contentElement.innerHTML = data.translation;

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the fetchTranslation function when the script loads
fetchTranslation();