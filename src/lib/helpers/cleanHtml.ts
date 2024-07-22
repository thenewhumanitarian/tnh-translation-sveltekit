// /lib/helpers/cleanHtml.ts

export function cleanHtml(html: string): string {
  let cleanedHtml = html.replace(/ dir="ltr"/g, '');
  cleanedHtml = cleanedHtml.replace(/<div id="mct-script"><\/div>/g, '');
  cleanedHtml = removeTrailingGreaterThan(cleanedHtml);
  return cleanedHtml;
}

// Helper function to clean up translated HTML content
function removeTrailingGreaterThan(html: string): string {
  return html.replace(/>\s*$/, '');
}