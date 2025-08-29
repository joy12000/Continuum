import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { searchChunks, getNotesByIds } from '../lib/supabaseService';
import { BM25, BM25Doc } from '../lib/search/bm25';
import { rrfFuse } from '../lib/search/rrf';

interface SearchResult {
  note_id: string;
  content: string;
  distance: number;
  score?: number;
}

interface Note {
  id: string;
  body: string;
  title?: string;
  tags?: string[];
  citations?: { noteId: string }[];
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [notesMap, setNotesMap] = useState<Map<string, Note>>(new Map());
  const [loading, setLoading] = useState(false);
  const [bm25, setBm25] = useState<BM25 | null>(null);

  const handleSearch = useCallback(async (currentQuery: string) => {
    if (!currentQuery.trim()) {
      setResults([]);
      setNotesMap(new Map());
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const semanticResultsRaw = await searchChunks(currentQuery, user.id);
      const semanticResults = (semanticResultsRaw || []).map(r => ({ id: r.note_id, score: 1 / (r.distance + 0.1), content: r.content, distance: r.distance }));

      let bm25Results: { id: string; score: number; }[] = [];
      if (bm25) {
        bm25Results = bm25.search(currentQuery);
      }

      const fusedResults = rrfFuse([semanticResults, bm25Results]);
      fusedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      const finalResults = fusedResults.map(r => {
        const semanticResult = semanticResults.find(sr => sr.id === r.id);
        return {
          note_id: r.id,
          content: semanticResult ? semanticResult.content : "",
          distance: semanticResult ? semanticResult.distance : 0,
          score: r.score
        }
      });

      setResults(finalResults);

      if (finalResults.length > 0) {
        const uniqueNoteIds = [...new Set(finalResults.map(r => r.note_id))];
        const notesData = await getNotesByIds(uniqueNoteIds);
        
        const newNotesMap = new Map<string, Note>();
        (notesData || []).forEach((note: Note) => {
          newNotesMap.set(note.id, note);
        });
        setNotesMap(newNotesMap);
      }

    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [bm25]);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // This effect is to build the BM25 index
  useEffect(() => {
    // This should be triggered when the notes data changes.
    // For now, we don't have a good way to get all notes efficiently.
    // This is a placeholder for future improvement.
  }, []);

  return { query, setQuery, results, loading, notesMap };
}
