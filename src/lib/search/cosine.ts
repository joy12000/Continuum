export function cosineSim(a: number[] | undefined, b: number[] | undefined): number {
  if (!a || !b) return 0;
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i=0; i<len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
