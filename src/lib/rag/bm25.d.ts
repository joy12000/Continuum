export type BM25Doc = {
    id: string;
    tokens: string[];
};
export type BM25Index = {
    df: Map<string, number>;
    avgdl: number;
    N: number;
    docs: BM25Doc[];
};
export declare function buildBM25(docs: BM25Doc[]): BM25Index;
export declare function bm25Score(q: string, docTokens: string[], idx: BM25Index, k1?: number, b?: number): number;
//# sourceMappingURL=bm25.d.ts.map