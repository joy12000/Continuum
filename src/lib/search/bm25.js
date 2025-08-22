import { tokenize } from "../tokenize";
export class BM25 {
    docs = [];
    index = new Map();
    docFreq = new Map();
    avgdl = 0;
    k1 = 1.5;
    b = 0.75;
    lengths = new Map();
    tf = new Map(); // term -> (docId -> tf)
    add(doc) {
        this.docs.push(doc);
    }
    build() {
        let totalLen = 0;
        for (const d of this.docs) {
            const toks = tokenize(d.text);
            totalLen += toks.length;
            this.lengths.set(d.id, toks.length);
            const termCounts = new Map();
            for (const t of toks) {
                termCounts.set(t, (termCounts.get(t) || 0) + 1);
            }
            for (const [t, c] of termCounts) {
                // doc freq
                this.docFreq.set(t, (this.docFreq.get(t) || 0) + 1);
                // posting
                if (!this.index.has(t))
                    this.index.set(t, new Set());
                this.index.get(t).add(d.id);
                if (!this.tf.has(t))
                    this.tf.set(t, new Map());
                this.tf.get(t).set(d.id, c);
            }
        }
        this.avgdl = this.docs.length ? totalLen / this.docs.length : 0;
    }
    search(query, topK = 20) {
        const qToks = tokenize(query);
        const N = this.docs.length || 1;
        const scores = new Map();
        for (const q of qToks) {
            const df = this.docFreq.get(q) || 0;
            if (df === 0)
                continue;
            const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
            const postings = this.tf.get(q);
            for (const [docId, tf] of postings) {
                const dl = this.lengths.get(docId) || 0;
                const denom = tf + this.k1 * (1 - this.b + this.b * (dl / (this.avgdl || 1)));
                const score = idf * (tf * (this.k1 + 1)) / (denom || 1e-9);
                scores.set(docId, (scores.get(docId) || 0) + score);
            }
        }
        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, topK)
            .map(([id, score]) => ({ id, score }));
    }
}
