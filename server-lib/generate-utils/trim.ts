
import type { Note } from '../types';

export function trimContext(context: Note[], {
  maxNotes = 20,
  maxCharsPerNote = 1200,
  maxTotalChars = 18000,
} = {}): Note[] {
  const ctx = Array.isArray(context) ? context.slice(0, maxNotes) : [];
  const sliced = ctx.map(n => ({
    id: String(n.id),
    title: n.title ? String(n.title).slice(0, 160) : undefined,
    content: String(n.content || "").slice(0, maxCharsPerNote),
  }));
  let total = 0;
  const trimmed: Note[] = [];
  for (const n of sliced) {
    const c = n.content;
    if (total + c.length > maxTotalChars) break;
    total += c.length;
    trimmed.push(n);
  }
  return trimmed;
}
