export type SearchResult = {
    note_id: string;
    chunk_index: number;
    content: string;
    similarity: number;
};
export declare function useSearch(query: string, token: string | undefined): {
    results: SearchResult[];
    loading: boolean;
};
//# sourceMappingURL=useSearch.d.ts.map