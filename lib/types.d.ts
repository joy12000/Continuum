export type UUID = string;
export interface Note {
    id: UUID;
    title: string | null;
    content: string;
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
    threadId: string;
    title: string;
    summary: string;
    notes: Note[];
    relevanceScore: number;
    size: number;
}
//# sourceMappingURL=types.d.ts.map