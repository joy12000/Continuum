import React from 'react';
import { SearchResult } from '../hooks/useSearch';
interface SearchResultsListProps {
    results: SearchResult[];
    loading: boolean;
    noteTitlesMap: Record<string, string>;
    query: string;
    onNoteClick: (noteId: string) => void;
}
declare const SearchResultsList: React.FC<SearchResultsListProps>;
export default SearchResultsList;
//# sourceMappingURL=SearchResultsList.d.ts.map