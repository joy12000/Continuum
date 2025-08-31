
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';


export type SearchResult = {
  note_id: string;
  title: string;
  snippet_html: string;
  score: number;
};

export function useSearch(query: string, token: string | undefined) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || !token) {
      setResults([]);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/v1?action=search&q=${encodeURIComponent(trimmedQuery)}`, {
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
        setResults([]); // Clear results on error
      } finally {
        setLoading(false);
      }
    };

    // Debounce the search
    const handler = setTimeout(() => {
      performSearch();
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [query, token]);

  return { results, loading };
}
