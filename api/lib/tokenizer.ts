
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function tokenize(text: string): string[] {
  if (!text) return [];
  const strippedText = stripHtml(text);
  const lowered = strippedText.toLowerCase();
  const cleaned = lowered.replace(/[\p{P}\p{S}]+/gu, " ");
  const toks = cleaned.split(/\s+/).filter(Boolean);
  return toks.filter(t => t.length >= 2);
}
