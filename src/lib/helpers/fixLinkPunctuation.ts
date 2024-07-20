export function fixLinkPunctuation(text: string): string {
  // Fix misplaced punctuation inside anchor tags
  text = text.replace(/<a([^>]+)>([.,!?;:])([^<]+?)<\/a>/g, '$2<a$1>$3</a>');
  text = text.replace(/<a([^>]+)>([^<]+?)<\/a>([.,!?;:])/g, '<a$1>$2</a>$3');

  // Remove duplicated words outside anchor tags if they are the same as inside
  text = text.replace(/(\s+)(<a[^>]+>)([^<]+)<\/a>\3/g, '$1$2$3</a>');

  // Fix misplaced commas around anchor tags
  text = text.replace(/ ,<a/g, ', <a');

  return text;
}