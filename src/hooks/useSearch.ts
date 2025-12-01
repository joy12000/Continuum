
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type SearchResult = {
  document_id: string;
  note_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
};

export function useSearch(token: string | undefined) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || !token) {
      setResults([]);
      setLoading(false);
      return [];
    }

    setLoading(true);
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/v1?action=search&q=${encodeURIComponent(trimmedQuery)}&timestamp=${new Date().getTime()}`, {
        headers,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: 'Could not parse error body' }));
        throw new Error(`Search failed with status ${res.status}${errorBody.error ? `: ${errorBody.error}` : ''}`);
      }
      const data = await res.json();
      setResults(data);
      return data;
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { results, loading, search };
}
