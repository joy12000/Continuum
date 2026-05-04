export interface NoteLite {
    id: string;
    title?: string;
    body?: string;
    tags?: string[];
    citations?: {
        noteId: string;
    }[];
    sourceNoteId?: string;
    sourceNoteIds?: string[];
}
//# sourceMappingURL=types.d.ts.map
