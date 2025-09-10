export function highlightHTML(text, query) {
    if (!query?.trim())
        return text;
    const words = query.split(/\s+/).filter(Boolean).map(w => escapeRegExp(w));
    if (!words.length)
        return text;
    const re = new RegExp('(' + words.join('|') + ')', 'gi');
    return text.replace(re, '<mark>$1</mark>');
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
