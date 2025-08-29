export function semanticScoreFromDistance(distance?: number) {
  const d = typeof distance === 'number' ? distance : 0;
  return 1 / (1 + d + 0.1);
}
export function keywordScore(text: string, query: string) {
  if (!text || !query) return 0;
  const qs = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!qs.length) return 0;
  const t = text.toLowerCase();
  let hits = 0;
  for (const q of qs) {
    const m = t.match(new RegExp(escapeRegExp(q), 'g'));
    if (m) hits += Math.min(m.length, 3);
  }
  const lenNorm = Math.log10(20 + t.length);
  return (hits / lenNorm) / 5;
}
export function hybridScore({ distance, text, query, alpha = 0.8, beta = 0.2 }:
  { distance?: number; text: string; query: string; alpha?: number; beta?: number; }) {
  const sem = semanticScoreFromDistance(distance);
  const kw = keywordScore(text, query);
  return alpha * sem + beta * kw;
}
function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
