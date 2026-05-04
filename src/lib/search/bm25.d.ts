export interface BM25Doc {
    id: string;
    text: string;
}
export declare class BM25 {
    private docs;
    private index;
    private docFreq;
    private avgdl;
    private k1;
    private b;
    private lengths;
    private tf;
    add(doc: BM25Doc): void;
    build(): void;
    search(query: string, topK?: number): {
        id: string;
        score: number;
    }[];
}
//# sourceMappingURL=bm25.d.ts.map
