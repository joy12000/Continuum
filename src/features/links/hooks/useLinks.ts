import { useQuery } from '@tanstack/react-query';
import { fetchCachedThreads, CachedThreadsResponse } from '../services/linkService';
import { useAuth } from '../../../contexts/AuthContext';

export const useCachedThreads = () => {
    const { session } = useAuth();

    return useQuery<CachedThreadsResponse, Error>({
        queryKey: ['cachedThreads'],
        queryFn: fetchCachedThreads,
        enabled: !!session,
    });
};
