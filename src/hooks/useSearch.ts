
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';


export type SearchResult = {
  note_id: string;
  title: string;
  snippet_html: string;
  score: number;
};

export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        

        const res = await fetch(`/api/v1?action=search&q=${encodeURIComponent(trimmedQuery)}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (!res.ok) {
          throw new Error('Search request failed');
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
  }, [query]);

  return { results, loading };
}
