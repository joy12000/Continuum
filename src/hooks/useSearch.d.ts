import type { SearchResult } from '../types/common';
export declare function useSearch(token: string | undefined): {
    results: SearchResult[];
    loading: boolean;
    search: (query: string) => Promise<SearchResult[]>;
};
//# sourceMappingURL=useSearch.d.ts.map
