
// BM25 ranking algorithm implementation
// Based on https://github.com/retextjs/retext-search/blob/main/lib/bm25.js

const k1 = 1.2;
const b = 0.75;

function idf(N: number, n: number): number {
  return Math.log(1 + (N - n + 0.5) / (n + 0.5));
}

export class BM25 {
  private corpus: string[][];
  private idfs: { [key: string]: number } = {};
  private avgdl: number;

  constructor(corpus: string[][]) {
    this.corpus = corpus;
    const N = corpus.length;
    let dl_sum = 0;
    const term_doc_counts: { [key: string]: number } = {};

    for (const doc of corpus) {
      dl_sum += doc.length;
      const unique_terms = new Set(doc);
      for (const term of unique_terms) {
        term_doc_counts[term] = (term_doc_counts[term] || 0) + 1;
      }
    }

    this.avgdl = dl_sum / N;

    for (const term in term_doc_counts) {
      this.idfs[term] = idf(N, term_doc_counts[term]);
    }
  }

  search(query: string[]): number[] {
    const scores: number[] = new Array(this.corpus.length).fill(0);

    for (let i = 0; i < this.corpus.length; i++) {
      const doc = this.corpus[i];
      const dl = doc.length;
      const term_freqs: { [key: string]: number } = {};
      for (const term of doc) {
        term_freqs[term] = (term_freqs[term] || 0) + 1;
      }

      let doc_score = 0;
      for (const term of query) {
        if (this.idfs[term]) {
          const tf = term_freqs[term] || 0;
          const numerator = tf * (k1 + 1);
          const denominator = tf + k1 * (1 - b + b * (dl / this.avgdl));
          doc_score += this.idfs[term] * (numerator / denominator);
        }
      }
      scores[i] = doc_score;
    }

    return scores;
  }
}
