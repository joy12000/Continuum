import { tokenize } from "./chunker";
export function buildBM25(docs) { const df = new Map(); let total = 0; for (const d of docs) {
    total += d.tokens.length;
    const uniq = new Set(d.tokens);
    for (const t of uniq)
        df.set(t, (df.get(t) || 0) + 1);
} return { df, avgdl: total / Math.max(1, docs.length), N: docs.length, docs }; }
export function bm25Score(q, docTokens, idx, k1 = 1.2, b = 0.75) { const qTokens = tokenize(q); const tf = new Map(); for (const t of docTokens)
    tf.set(t, (tf.get(t) || 0) + 1); const dl = docTokens.length; let score = 0; for (const t of qTokens) {
    const n = idx.df.get(t) || 0;
    if (n === 0)
        continue;
    const idf = Math.log(((idx.N - n + 0.5) / (n + 0.5)) + 1);
    const freq = tf.get(t) || 0;
    const denom = freq + k1 * (1 - b + b * (dl / Math.max(1, idx.avgdl)));
    score += idf * ((freq * (k1 + 1)) / denom);
} return score; }
