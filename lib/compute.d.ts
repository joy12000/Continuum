import type { Note, NoteChunk, NoteLink } from "./types.js";
export type Weights = {
    citation: number;
    sim: number;
    tag: number;
};
export declare function averageVectors(vecs: number[][]): number[];
export declare function cosine(a: number[], b: number[]): number;
export type PreparedNote = {
    note: Note;
    embedding: number[];
    tags: string[];
};
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
//# sourceMappingURL=compute.d.ts.map