import React, { useEffect, useState, useCallback, useMemo } from "react";
import { computeConnections } from "../lib/graph/computeConnections";
import { getEmbeddingsMap } from "../lib/embeddings/getEmbeddingsMap";
import { ConnectionsPanel } from "./ConnectionsPanel";
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
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [vecById, setVecById] = useState<Map<string, number[]>>(new Map());

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
    const notes = Array.from(notesMap.values());
    if (notes.length > 0) {
      // @ts-ignore
      getEmbeddingsMap(notes).then(setVecById);
    }
  }, [notesMap]);

    const neighbors = useMemo(() => {
    const allNotes = Array.from(notesMap.values());
    if (!selectedNote || allNotes.length === 0) return [];
    // @ts-ignore
    return computeConnections(selectedNote, allNotes, vecById, { citation:1.0, sim:0.6, tag:0.2 }, 3)
      .map(n => ({ ...n, title: notesMap.get(String(n.toId))?.title || notesMap.get(String(n.toId))?.body.slice(0,40) || n.toId }));
  }, [selectedNote, notesMap, vecById]);

  const navigateToNote = (id: string | number) => {
    const note = notesMap.get(String(id));
    if (note) {
      setSelectedNote(note);
    }
  };

  function handleSelectRow(row: SearchResult) {
    // 4. Retrieve the pre-fetched note from the Map, no new API call needed
    const note = notesMap.get(row.note_id);
    if (note) {
      setSelectedNote(note);
    } else {
      // Fallback or error handling if note not found (should be rare)
      console.warn(`Note with id ${row.note_id} not found in pre-fetched map.`);
      setSelectedNote(null);
    }
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
            <div className="line-clamp-2">{r.content}</div>
          </button>
        ))}
      </div>

      {selectedNote && (
        <div className="mt-4 p-3 border rounded">
          <div className="font-semibold mb-2">선택한 노트</div>
          {/* Assuming body contains plain text, not HTML. Use dangerouslySetInnerHTML only if you trust the source. */}
          <div className="prose max-w-none whitespace-pre-wrap">{selectedNote.body}</div>
          <aside className="mt-4">
            <ConnectionsPanel neighbors={neighbors} onSelect={(id) => navigateToNote(id)} />
          </aside>
        </div>
      )}
    </div>
  );
};

export default Today;
