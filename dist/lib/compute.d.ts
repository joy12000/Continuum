import type { Note, NoteChunk, NoteLink, PreparedNote } from "./types.js";
export type Weights = {
    citation: number;
    sim: number;
    tag: number;
};
export declare function averageVectors(vecs: number[][]): number[];
export declare function cosine(a: number[], b: number[]): number;
export declare function prepareNotes(notes: Note[], chunks: NoteChunk[]): PreparedNote[];
export declare function tagOverlap(a: string[], b: string[]): number;
export declare function buildCitationSet(links: NoteLink[]): Set<string>;
export declare function pairScore(a: PreparedNote, b: PreparedNote, cites: Set<string>, w: Weights): number;
export type Edge = {
    i: number;
    j: number;
    score: number;
};
export declare function buildEdges(prepared: PreparedNote[], cites: Set<string>, w: Weights, capPairs?: number | null): Edge[];
export declare function autoThreshold(edges: Edge[]): number;
export declare function cluster(prepared: PreparedNote[], edges: Edge[], threshold?: number): {
    clusters: number[][];
    threshold: number;
};
export declare function clusterScore(indices: number[], edges: Edge[]): number;
/**
 * 파라미터-프리 가중치 라벨 전파(Label Propagation).
 * - 임계값 없이, 이웃 라벨 가중치합이 최대인 라벨로 갈아탐
 * - 너무 작은 군집은 강한 이웃 군집으로 흡수
 * - 셔플 없이 결정적 순회
 */
export declare function clusterLPA(prepared: PreparedNote[], edges: Edge[], opts?: {
    maxIter?: number;
    minEdge?: number;
    minClusterSize?: number;
}): {
    clusters: number[][];
};
/**
 * 목표 군집 수 범위를 만족하도록 임계값 자동 탐색 + 모듈러리티 최대 지점 선택
 */
export declare function clusterByAutoThreshold(prepared: PreparedNote[], edges: Edge[], opts?: {
    kMin?: number;
    kMax?: number;
    iters?: number;
    grid?: number;
}): {
    clusters: number[][];
    threshold: number;
    Q: number;
};
export declare function detectIsolatedNodes(n: number, edges: Edge[], isoCut?: number): Set<number>;
/** 상호 kNN + 최소 점수 컷으로 간선 성기화 */
export declare function sparsifyEdgesKNN(n: number, edges: Edge[], k?: number, { mutual, minScore }?: {
    mutual?: boolean;
    minScore?: number;
}): Edge[];
export declare function forceSplitByMST(n: number, edges: Edge[], k: number): number[][];
export declare function clusterHybrid(prepared: PreparedNote[], edgesAll: Edge[], pref?: {
    kMin?: number;
    kMax?: number;
    minEdge?: number;
    minClusterSize?: number;
    knnK?: number;
    mutual?: boolean;
    isoCut?: number;
}): {
    clusters: number[][];
    method: "hybrid+knn+isolation+absorb";
    meta: {
        knnK: number;
        mutual: boolean;
        isoCut: number;
    };
};
//# sourceMappingURL=compute.d.ts.map