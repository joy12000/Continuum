
import React, { useState, useEffect, useMemo } from 'react';
import { db, Note } from '../lib/db';
import { Trash2, Edit, Save, XCircle } from 'lucide-react';

interface SearchResult {
  id: string;
  score: number;
}

const Today = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');

  const searchWorker = useMemo(() =>
    new Worker(new URL('../workers/searchWorker.ts', import.meta.url), { type: 'module' })
  , []);

  useEffect(() => {
    const handleWorkerMessage = async (e: MessageEvent) => {
      if (e.data.type === 'SIMILAR_RESULT') {
        setSearchResults(e.data.payload);
      } else if (e.data.ok && e.data.result) {
        const results: SearchResult[] = e.data.result;
        const notes = await db.notes.where('id').anyOf(results.map(r => r.id)).toArray();
        const sortedNotes = results.map(r => notes.find(n => n.id === r.id)).filter(Boolean) as Note[];
        setSearchResults(sortedNotes);
      }
    };

    searchWorker.addEventListener('message', handleWorkerMessage);

    return () => {
      searchWorker.removeEventListener('message', handleWorkerMessage);
    };
  }, [searchWorker]);

  useEffect(() => {
    const handleSearch = () => {
      if (query.trim() === '') {
        setSearchResults([]);
        return;
      }
      searchWorker.postMessage({ type: 'score', payload: { q: query, engine: 'auto', notes: [] } });
    };

    const debounce = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, searchWorker]);

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
    setEditedText(note.content);
  };

  const handleEdit = () => {
    if (!selectedNote) return;
    setIsEditing(true);
    setEditedText(selectedNote.content);
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    await db.notes.update(selectedNote.id!, { content: editedText });
    const updatedNote = { ...selectedNote, content: editedText };
    setSelectedNote(updatedNote);
    // Update search results list as well
    setSearchResults(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selectedNote || !window.confirm('Are you sure you want to delete this note?')) return;
    await db.notes.delete(selectedNote.id!);
    setSearchResults(prev => prev.filter(n => n.id !== selectedNote.id));
    setSelectedNote(null);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Left Column: Search and Results */}
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
          {searchResults.length > 0 ? (
            <ul>
              {searchResults.map((note) => (
                <li key={note.id}>
                  <button
                    onClick={() => handleSelectNote(note)}
                    className={`w-full text-left p-4 border-l-4 ${selectedNote?.id === note.id ? 'border-blue-500 bg-blue-50 dark:bg-gray-800' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                    <h3 className="font-semibold truncate">{note.content.split('\n')[0]}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {note.content.split('\n').slice(1).join(' ') || 'No additional content'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p>No search results.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Note Viewer/Editor */}
      <div className="col-span-1 md:col-span-2 p-6 flex flex-col">
        {selectedNote ? (
          <>
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <h2 className="text-2xl font-bold">{selectedNote.content.split('\n')[0]}</h2>
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
                  {editedText}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a note to view or edit.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Today;
