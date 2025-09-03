import React, { useEffect, useState, useCallback, useMemo } from "react";

import { supabase } from "../lib/supabase";
import { searchChunks, getNotesByIds } from "../lib/supabaseService";

// Define a more specific type for a search result chunk
interface SearchResult {
  note_id: string;
  content: string;
  distance: number;
}

// Define a type for the full note object
interface Note {
  id: string;
  body: string;
  title?: string;
  tags?: string[];
  citations?: { noteId: string }[];
  // Add other note properties if needed, e.g., title, created_at
}

const Today: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [notesMap, setNotesMap] = useState<Map<string, Note>>(new Map());
  const [loading, setLoading] = useState(false);

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

      // 1. Fetch relevant chunks
      const rows = await searchChunks(currentQuery, user.id);
      const searchResults = rows || [];
      // Sort results by distance (lower is better)
      searchResults.sort((a, b) => a.distance - b.distance);
      setResults(searchResults);

      // 2. If chunks are found, fetch all their parent notes at once
      if (searchResults.length > 0) {
        const uniqueNoteIds = [...new Set(searchResults.map(r => r.note_id))];
        const notesData = await getNotesByIds(uniqueNoteIds);
        
        // 3. Create a Map for instant lookups
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  useEffect(() => {
    const handleNotesUpdated = () => {
      handleSearch(query);
    };
    window.addEventListener('notes:updated', handleNotesUpdated);
    return () => {
      window.removeEventListener('notes:updated', handleNotesUpdated);
    };
  }, [query, handleSearch]);

  function handleSelectRow(row: SearchResult) {
    window.dispatchEvent(new CustomEvent('open:note', { detail: { id: row.note_id } }));
  }

  return (
    <div className="p-4 space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색어를 입력하세요"
        className="input input-bordered w-full"
      />
      {loading && <div className="text-center p-4">검색 중...</div>}
      <div className="space-y-2">
        {results.map((r, i) => (
          <button key={`${r.note_id}-${i}`} onClick={() => handleSelectRow(r)} className="block w-full text-left p-2 hover:bg-gray-100 rounded">
            <div className="text-xs opacity-60">score: {typeof r.distance === "number" ? r.distance.toFixed(3) : "-"}</div>
            <div className="line-clamp-2">{r.body}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Today;
