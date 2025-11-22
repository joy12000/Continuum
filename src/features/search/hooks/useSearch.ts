import { useQuery, useMutation } from '@tanstack/react-query';
import { searchNotes, generateSearchAnswer, SearchResult } from '../services/searchService';
import { useAuth } from '../../../contexts/AuthContext';

export const useSearchQuery = (query: string) => {
    const { session } = useAuth();

    return useQuery<SearchResult[], Error>({
        queryKey: ['search', query],
        queryFn: () => searchNotes(query),
        enabled: !!session && query.trim().length >= 2,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useSearchAnswer = () => {
    return useMutation({
        mutationFn: async ({ query, results }: { query: string; results: SearchResult[] }) => {
            return generateSearchAnswer(query, results);
        },
    });
};
