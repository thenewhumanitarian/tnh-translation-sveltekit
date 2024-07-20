export function removeUnwantedSpaces(text: string): string {
  // Remove spaces before punctuation marks
  text = text.replace(/\s+([.,!?;:])/g, '$1');

  // Remove spaces before closing HTML tags
  text = text.replace(/\s+(<\/[a-z]+>)/gi, '$1');

  // Remove unwanted whitespace sequences
  text = text.replace(/\s*\n\s*/g, '\n'); // Collapse multiple newlines into one
  text = text.replace(/\n+/g, '\n'); // Remove multiple newlines
  text = text.replace(/\t+/g, ''); // Remove all tabs

  return text.trim();
}