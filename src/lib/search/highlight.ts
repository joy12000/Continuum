export function highlightHTML(text: string, query: string): string {
  if (!query?.trim()) return text;
  const words = query.split(/\s+/).filter(Boolean).map(w => escapeRegExp(w));
  if (!words.length) return text;
  const re = new RegExp('(' + words.join('|') + ')', 'gi');
  return text.replace(re, '<mark>$1</mark>');
}
function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
