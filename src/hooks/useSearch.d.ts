export type SearchResult = {
    noteId: string | null;
    content: string;
    score?: number | null;
    uri?: string;
    fileName?: string;
    chunkId?: string;
};
export declare function useSearch(query: string, token: string | undefined): {
    results: SearchResult[];
    loading: boolean;
};
//# sourceMappingURL=useSearch.d.ts.map
