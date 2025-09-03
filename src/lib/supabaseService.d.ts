export declare function addNoteAndChunks(note: {
    title?: string;
    body: string;
    user_id: string;
}): Promise<any>;
export declare function recalculateChunksAndEmbeddings(noteId: string, newBody: string): Promise<void>;
export declare function listNotes(userId: string): Promise<{
    id: any;
    title: any;
    body: any;
    created_at: any;
    updated_at: any;
    tags: any;
    citations: any;
}[]>;
export declare function getNoteById(noteId: string, userId: string): Promise<any>;
export declare function getNotesByIds(noteIds: string[]): Promise<any>;
export declare function searchChunks(query: string, userId: string): Promise<{
    note_id: string;
    chunk_index: number;
    body: string;
    distance: number;
}[]>;
export declare function deleteAllUserData(userId: string): Promise<void>;
export declare function bulkAddNotes(notes: {
    title?: string;
    body: string;
}[], user_id: string): Promise<void>;
//# sourceMappingURL=supabaseService.d.ts.map