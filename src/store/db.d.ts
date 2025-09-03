import Dexie, { Table } from "dexie";
export interface Note {
    id: string;
    title?: string;
    body: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
}
export interface Attachment {
    id: string;
    noteId: string;
    name: string;
    type: string;
    blob?: Blob;
    url?: string;
    createdAt: number;
}
export interface Embedding {
    id?: number;
    noteId: string;
    vec: number[];
    updatedAt?: number;
}
export interface DedupLog {
    id?: number;
    ts: number;
    sim: number;
    accepted: boolean;
}
export interface Snapshot {
    id: string;
    createdAt: number;
    noteCount: number;
}
export declare class AppDB extends Dexie {
    notes: Table<Note, string>;
    attachments: Table<Attachment, string>;
    embeddings: Table<Embedding, number>;
    dedup_logs: Table<DedupLog, number>;
    snapshots: Table<Snapshot, string>;
    constructor();
    mergeNotes(keepId: string, removeIds: string[]): Promise<void>;
}
export declare const db: AppDB;
//# sourceMappingURL=db.d.ts.map