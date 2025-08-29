
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
    if (!query) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
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
