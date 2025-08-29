import type { Id, Note, Sentence } from '../types';

export function splitSentences(s: string): string[] {
  if (!s || typeof s !== 'string') return [];
  const sentences = s.match(/(.*?[.!?다요])(?=\s|$)/g) || [];
  return sentences.map(sentence => sentence.trim()).filter(Boolean);
}

function normalizeTokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9가-힣\s]/g, " ")
    .split(/\s+/) 
    .filter(w => w && w.length > 1);
}

function jaccard(aArr: string[], bArr: string[]): number {
  const a = new Set(aArr), b = new Set(bArr);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter || 1;
  return inter / uni;
}

export function mapSources(answerSentences: Sentence[], context: Note[]) {
  const results: Sentence[] = [];
  const srcSet = new Map<Id, string>();
  const ctx = Array.isArray(context) ? context : [];
  const ctxTokens = ctx.map(n => ({
    id: String(n.id),
    content: String(n.content || ""),
    tokens: normalizeTokens(String(n.content || ""))
  }));

  for (const sent of answerSentences) {
    const text = String(sent?.text || sent || "");
    let srcId: Id | null = sent?.sourceNoteId ?? null;

    if (!srcId || !ctx.some(n => String(n.id) === String(srcId))) {
      const t = normalizeTokens(text);
      let best = { id: null as Id | null, score: 0 };
      for (const c of ctxTokens) {
        const score = jaccard(t, c.tokens);
        if (score > best.score) best = { id: c.id, score };
      }
      srcId = best.score >= 0.2 ? best.id : null;
    }

    results.push({ text, sourceNoteId: srcId });

    if (srcId) {
      const note = ctx.find(n => String(n.id) === String(srcId));
      if (note && !srcSet.has(srcId)) {
        const snippet = String(note.content || "").slice(0, 200);
        srcSet.set(srcId, snippet);
      }
    }
  }

  const sources = Array.from(srcSet, ([noteId, snippet]) => ({ noteId, snippet }));
  return { sentences: results, sources };
}