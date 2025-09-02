import { clamp01, mean, stddev } from "./utils.js";
export function averageVectors(vecs) {
    if (vecs.length === 0)
        return [];
    const dim = vecs[0]?.length ?? 0;
    const out = new Array(dim).fill(0);
    for (const v of vecs) {
        for (let i = 0; i < dim; i++)
            out[i] += v[i] ?? 0;
    }
    const n = vecs.length;
    for (let i = 0; i < dim; i++)
        out[i] /= n;
    return out;
}
export function cosine(a, b) {
    if (!a.length || !b.length || a.length !== b.length)
        return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        const x = a[i], y = b[i];
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    if (na === 0 || nb === 0)
        return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
export function prepareNotes(notes, chunks) {
    const byNote = {};
    for (const ch of chunks) {
        if (!byNote[ch.note_id])
            byNote[ch.note_id] = [];
        byNote[ch.note_id].push(ch.embedding);
    }
    return notes.map((n) => ({
        note: n,
        embedding: averageVectors(byNote[n.id] ?? []),
        tags: Array.isArray(n.tags) ? n.tags : []
    }));
}
export function tagOverlap(a, b) {
    if (!a?.length || !b?.length)
        return 0;
    const A = new Set(a.map((x) => x.toLowerCase()));
    const B = new Set(b.map((x) => x.toLowerCase()));
    const inter = [...A].filter((x) => B.has(x)).length;
    const denom = Math.max(A.size, B.size);
    if (denom === 0)
        return 0;
    return inter / denom;
}
export function buildCitationSet(links) {
    const s = new Set();
    for (const l of links) {
        s.add(`${l.from_note_id}→${l.to_note_id}`);
    }
    return s;
}
export function pairScore(a, b, cites, w) {
    const sim = cosine(a.embedding, b.embedding); // 0..1 (approx)
    const citation = (cites.has(`${a.note.id}→${b.note.id}`) || cites.has(`${b.note.id}→${a.note.id}`)) ? 1 : 0;
    const tag = tagOverlap(a.tags, b.tags);
    const raw = w.sim * sim + w.citation * citation + w.tag * tag;
    const maxW = w.sim + w.citation + w.tag || 1;
    return clamp01(raw / maxW);
}
export function buildEdges(prepared, cites, w, capPairs = null) {
    const edges = [];
    const n = prepared.length;
    let count = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const score = pairScore(prepared[i], prepared[j], cites, w);
            edges.push({ i, j, score });
            count++;
            if (capPairs && count >= capPairs)
                return edges;
        }
    }
    return edges;
}
class DSU {
    constructor(n) {
        this.p = Array.from({ length: n }, (_, i) => i);
        this.r = new Array(n).fill(0);
    }
    f(x) { return this.p[x] === x ? x : (this.p[x] = this.f(this.p[x])); }
    u(a, b) {
        a = this.f(a);
        b = this.f(b);
        if (a === b)
            return;
        if (this.r[a] < this.r[b])
            [a, b] = [b, a];
        this.p[b] = a;
        if (this.r[a] === this.r[b])
            this.r[a]++;
    }
}
export function autoThreshold(edges) {
    if (edges.length === 0)
        return 0.5;
    const scores = edges.map((e) => e.score).filter((x) => isFinite(x));
    const m = mean(scores);
    const s = stddev(scores);
    // baseline 0.35, nudge by distribution
    return Math.max(0.35, Math.min(0.75, m + 0.15 * s));
}
export function cluster(prepared, edges, threshold) {
    const dsu = new DSU(prepared.length);
    const thr = threshold ?? autoThreshold(edges);
    for (const e of edges) {
        if (e.score >= thr)
            dsu.u(e.i, e.j);
    }
    const groups = new Map();
    for (let i = 0; i < prepared.length; i++) {
        const root = dsu.f(i);
        if (!groups.has(root))
            groups.set(root, []);
        groups.get(root).push(i);
    }
    // Filter tiny groups of size 1 that have no strong edges; still keep singletons as micro-threads
    const clusters = [...groups.values()];
    return { clusters, threshold: thr };
}
export function clusterScore(indices, edges) {
    // average of internal edges
    const set = new Set(indices.map((x) => x));
    const rel = edges.filter((e) => set.has(e.i) && set.has(e.j));
    if (!rel.length)
        return 0;
    const avg = mean(rel.map((e) => e.score));
    return avg;
}
