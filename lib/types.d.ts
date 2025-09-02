export type UUID = string;
export interface Note {
    id: UUID;
    title: string | null;
    content: string | null;
    tags: string[];
    created_at: string;
    updated_at: string;
}
export interface NoteChunk {
    note_id: UUID;
    embedding: number[];
}
export interface NoteLink {
    from_note_id: UUID;
    to_note_id: UUID;
}
export interface InsightThread {
    id: string;
    title: string;
    summary: string;
    note_ids: UUID[];
    size: number;
    score: number;
}
//# sourceMappingURL=types.d.ts.map