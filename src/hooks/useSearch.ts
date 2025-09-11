
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type SearchResult = {
  note_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
};

export function useSearch(token: string | undefined) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || !token) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not found. Please log in.');
      }
      const userId = user.id;

      const res = await fetch(`/api/v1?action=search&q=${encodeURIComponent(trimmedQuery)}&uid=${userId}&timestamp=${new Date().getTime()}`, {
        headers,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: 'Could not parse error body' }));
        throw new Error(`Search failed with status ${res.status}${errorBody.error ? `: ${errorBody.error}` : ''}`);
      }
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { results, loading, search };
}
