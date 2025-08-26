import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { searchChunks } from '../lib/supabaseService';
import { Trash2, Edit, Save, XCircle } from 'lucide-react';
import { debounce } from 'lodash';

interface SearchResult {
  note_id: string;
  content: string;
  distance: number;
}

interface Note {
  id: string;
  body: string | null;
  [key: string]: any;
}

const Today = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (currentQuery: string) => {
      if (currentQuery.trim() === '') {
        setSearchResults([]);
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsLoading(true);
      const results = await searchChunks({ query: currentQuery, userId: user.id });
      setSearchResults(results || []);
      setIsLoading(false);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  const handleSelectNote = async (row: SearchResult) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", row.note_id)
      .single();

    if (!error && data) {
      setSelectedNote(data);
      setEditedText(data.body ?? "");
      setIsEditing(false);
    } else {
      console.error("Error fetching note:", error);
    }
  };

  const handleEdit = () => {
    if (!selectedNote) return;
    setIsEditing(true);
    setEditedText(selectedNote.body ?? '');
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notes')
      .update({ body: editedText, updated_at: new Date().toISOString() })
      .eq('id', selectedNote.id)
      .select()
      .single();

    if (!error && data) {
      setSelectedNote(data);
      setIsEditing(false);
      debouncedSearch(query);
    } else {
      console.error("Error saving note:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote || !window.confirm('Are you sure you want to delete this note?')) return;
    
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', selectedNote.id);

    if (!error) {
      setSearchResults(prev => prev.filter(r => r.note_id !== selectedNote.id));
      setSelectedNote(null);
      setIsEditing(false);
    } else {
      console.error("Error deleting note:", error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText(selectedNote?.body ?? '');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="col-span-1 md:border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-grow overflow-y-auto">
          {isLoading ? (
             <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : searchResults.length > 0 ? (
            <div>
              {searchResults.map((r, i) => (
                <button key={`${r.note_id}-${i}`} onClick={() => handleSelectNote(r)} className="text-left w-full p-3 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-xs opacity-70 font-mono">score: {r.distance.toFixed(4)}</div>
                  <div className="line-clamp-3 text-sm mt-1">{r.content}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p>No search results.</p>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-1 md:col-span-2 p-6 flex flex-col">
        {selectedNote ? (
          <>
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <h2 className="text-2xl font-bold truncate">Note {selectedNote.id.substring(0, 8)}</h2>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={handleSave} className="p-2 rounded-md bg-green-500 text-white hover:bg-green-600"><Save size={20} /></button>
                    <button onClick={handleCancelEdit} className="p-2 rounded-md bg-gray-500 text-white hover:bg-gray-600"><XCircle size={20} /></button>
                  </>
                ) : (
                  <button onClick={handleEdit} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"><Edit size={20} /></button>
                )}
                <button onClick={handleDelete} className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900 text-red-500"><Trash2 size={20} /></button>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full h-full p-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {selectedNote.body}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a search result to view the full note.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Today;