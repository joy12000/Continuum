export type SearchResult = {
    note_id: string;
    title: string;
    snippet_html: string;
    score: number;
};
export declare function useSearch(query: string, token: string | undefined): {
    results: SearchResult[];
    loading: boolean;
};
//# sourceMappingURL=useSearch.d.ts.map
