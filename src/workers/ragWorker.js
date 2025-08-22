/// <reference lib="webworker" />
import { toSentences, tokenize } from "../lib/rag/chunker";
import { buildBM25, bm25Score } from "../lib/rag/bm25";
import { mmrSelect, cosine } from "../lib/rag/mmr";
let cache = { chunks: [], bm25: null };
async function ensureChunks(notes) {
    if (cache.chunks.length > 0)
        return cache.chunks;
    let allNotes = notes || [];
    try {
        if (!allNotes.length) {
            const mod = await import("../lib/db");
            // @ts-ignore
            const rows = await (mod.db?.notes?.toArray?.() || []);
            allNotes = rows;
        }
    }
    catch { }
    const out = [];
    for (const n of allNotes) {
        const text = String(n?.content || "");
        const sents = toSentences(text);
        sents.forEach((s, i) => out.push({ id: crypto.randomUUID(), noteId: n?.id || "", pos: i, text: s, tags: n?.tags || [], createdAt: Number(n?.createdAt || 0), tokens: tokenize(s) }));
    }
    cache.chunks = out;
    cache.bm25 = buildBM25(out.map(c => ({ id: c.id, tokens: c.tokens })));
    return out;
}
async function embed(engine, texts) {
    const { getSemanticAdapter } = await import("../lib/semantic");
    const a = await getSemanticAdapter(engine);
    await a.ensureReady();
    return await a.embed(texts);
}
self.addEventListener("message", async (e) => {
    const { id, type, payload } = e.data || {};
    try {
        if (type === "ask") {
            const p = payload;
            const chunks = await ensureChunks(p.notes);
            if (chunks.length === 0) {
                self.postMessage({ id, ok: true, result: { keypoints: [], citations: [] } });
                return;
            }
            const [qvec] = await embed(p.engine, [p.q]);
            // Precompute chunk vecs in batches
            const texts = chunks.map(c => c.text);
            const vecs = new Array(chunks.length);
            for (let i = 0; i < texts.length; i += 64) {
                const part = texts.slice(i, i + 64);
                const emb = await embed(p.engine, part);
                for (let j = 0; j < emb.length; j++)
                    vecs[i + j] = emb[j];
            }
            // Blend scores for candidates
            const idx = cache.bm25;
            const alpha = p.alphaSem ?? 0.6;
            const scores = [];
            for (let i = 0; i < chunks.length; i++) {
                const s = alpha * cosine(vecs[i], qvec) + (1 - alpha) * bm25Score(p.q, chunks[i].tokens, idx);
                scores.push({ i, s });
            }
            scores.sort((a, b) => b.s - a.s);
            const cand = scores.slice(0, p.topN ?? 50).map(({ i, s }) => ({ id: chunks[i].id, vec: vecs[i], score: s, idx: i }));
            const picked = mmrSelect(cand, qvec, p.topK ?? 8, p.lambdaMMR ?? 0.4);
            const seen = new Set();
            const keypoints = [];
            const citations = [];
            for (const it of picked) {
                const c = chunks.find(c => c.id === it.id);
                if (!c)
                    continue;
                if (!seen.has(c.noteId)) {
                    keypoints.push(c.text);
                    seen.add(c.noteId);
                }
                citations.push({ text: c.text, noteId: c.noteId, pos: c.pos, tags: c.tags, createdAt: c.createdAt });
                if (keypoints.length >= 3)
                    break;
            }
            self.postMessage({ id, ok: true, result: { keypoints, citations } });
            return;
        }
        if (type === "dedup") {
            const p = payload || {};
            const notes = (p.notes || []);
            const thr = typeof p.threshold === "number" ? p.threshold : 0.92;
            const maxN = Math.min(notes.length, p.max || 500);
            const texts = notes.slice(0, maxN).map(n => String(n.content || ""));
            const vecs = await embed(p.engine || "auto", texts);
            const pairs = [];
            for (let i = 0; i < maxN; i++) {
                for (let j = i + 1; j < maxN; j++) {
                    const lenOk = Math.abs(texts[i].length - texts[j].length) / Math.max(1, texts[i].length, texts[j].length) < 0.5;
                    if (!lenOk)
                        continue;
                    const s = cosine(vecs[i], vecs[j]);
                    if (s >= thr)
                        pairs.push({ a: i, b: j, s });
                }
            }
            const parent = new Array(maxN).fill(0).map((_, i) => i);
            const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
            const uni = (x, y) => { x = find(x); y = find(y); if (x !== y)
                parent[y] = x; };
            for (const p2 of pairs)
                uni(p2.a, p2.b);
            const groups = new Map();
            for (let i = 0; i < maxN; i++) {
                const r = find(i);
                if (!groups.has(r))
                    groups.set(r, []);
                groups.get(r).push(i);
            }
            const result = Array.from(groups.values()).filter(g => g.length > 1).map(g => ({ ids: g.map(i => notes[i].id), score: 1, size: g.length }));
            self.postMessage({ id, ok: true, result });
            return;
        }
        if (type === "resetIndex") {
            cache = { chunks: [], bm25: null };
            self.postMessage({ id, ok: true, result: "ok" });
            return;
        }
        self.postMessage({ id, ok: false, error: "unknown command" });
    }
    catch (err) {
        self.postMessage({ id, ok: false, error: String(err?.message || err) });
    }
});
