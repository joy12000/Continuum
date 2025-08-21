
import { tokenize } from "../tokenize";

export interface BM25Doc {
  id: string;
  text: string;
}

export class BM25 {
  private docs: BM25Doc[] = [];
  private index: Map<string, Set<string>> = new Map();
  private docFreq: Map<string, number> = new Map();
  private avgdl = 0;
  private k1 = 1.5;
  private b = 0.75;
  private lengths: Map<string, number> = new Map();
  private tf: Map<string, Map<string, number>> = new Map(); // term -> (docId -> tf)

  add(doc: BM25Doc) {
    this.docs.push(doc);
  }

  build() {
    let totalLen = 0;
    for (const d of this.docs) {
      const toks = tokenize(d.text);
      totalLen += toks.length;
      this.lengths.set(d.id, toks.length);
      const termCounts = new Map<string, number>();
      for (const t of toks) {
        termCounts.set(t, (termCounts.get(t) || 0) + 1);
      }
      for (const [t, c] of termCounts) {
        // doc freq
        this.docFreq.set(t, (this.docFreq.get(t) || 0) + 1);
        // posting
        if (!this.index.has(t)) this.index.set(t, new Set());
        this.index.get(t)!.add(d.id);
        if (!this.tf.has(t)) this.tf.set(t, new Map());
        this.tf.get(t)!.set(d.id, c);
      }
    }
    this.avgdl = this.docs.length ? totalLen / this.docs.length : 0;
  }

  search(query: string, topK = 20): { id: string; score: number }[] {
    const qToks = tokenize(query);
    const N = this.docs.length || 1;
    const scores = new Map<string, number>();
    for (const q of qToks) {
      const df = this.docFreq.get(q) || 0;
      if (df === 0) continue;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      const postings = this.tf.get(q)!;
      for (const [docId, tf] of postings) {
        const dl = this.lengths.get(docId) || 0;
        const denom = tf + this.k1 * (1 - this.b + this.b * (dl / (this.avgdl || 1)));
        const score = idf * (tf * (this.k1 + 1)) / (denom || 1e-9);
        scores.set(docId, (scores.get(docId) || 0) + score);
      }
    }
    return Array.from(scores.entries())
      .sort((a,b) => b[1] - a[1])
      .slice(0, topK)
      .map(([id, score]) => ({ id, score }));
  }
}
