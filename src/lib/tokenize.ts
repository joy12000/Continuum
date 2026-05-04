

export function stripHtmlToText(html: string): string {
  if (typeof document === "undefined") {
    // Basic server-side HTML stripping using regex
    return html.replace(/<[^>]*>/g, "").trim();
  }
  try {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").trim();
  } catch {
    return html;
  }
}

export function tokenize(text: string): string[] {
  text = stripHtmlToText(text);

  // Lowercase basic latin; keep Hangul as-is ( casing not relevant )
  const lowered = text.toLowerCase();
  // Replace punctuation with spaces, split on whitespace
  const cleaned = lowered.replace(/[\p{P}\p{S}]+/gu, " ");
  const toks = cleaned.split(/\s+/).filter(Boolean);
  // Remove super-short tokens
  return toks.filter(t => t.length >= 2);
}
