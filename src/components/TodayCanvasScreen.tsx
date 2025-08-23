import React, { useState, useEffect, useCallback } from 'react';
import { SearchBar } from './SearchBar';
import { RichNoteEditor } from './RichNoteEditor';
import { Plus, Sun, Moon, Search, FilePlus, PenSquare, Settings, Home } from 'lucide-react';
import { Note } from '../lib/db';
import { AnswerData } from '../types/common';
import { GeneratedAnswer } from './GeneratedAnswer';
import { toast } from '../lib/toast';

// --- 타입 정의 ---
type Theme = 'light' | 'dark' | 'system';
type ViewMode = 'list' | 'timeline' | 'graph';
type View = 'today' | 'settings' | 'diagnostics';

interface TodayCanvasScreenProps {
  notes: Note[];
  query: string;
  onQueryChange: (q: string) => void;
  onSearchFocus: () => void;
  suggestedQuestions: string[];
  isLoadingSuggestions: boolean;
  suggestionError: string | null;
  generatedAnswer: {
    data: AnswerData | null;
    isLoading: boolean;
    error: string | null;
  };
  onNewNote: () => void;
  onNavigate: (view: View) => void;
  activeNote: Note | null;
  onNoteSelect: (id: string) => void;
}

function NoteCard({ note, onSelect, isActive }: { note: Note, onSelect: (id: string) => void, isActive: boolean }) {
  return (
    <article 
      onClick={() => onSelect(note.id)} 
      className={`bg-gray-800/50 p-4 rounded-lg shadow-md hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer ${isActive ? 'ring-2 ring-indigo-500' : ''}`}>
      <div className="text-xs text-gray-400 mb-2">{new Date(note.updatedAt).toLocaleString()}</div>
      <div 
        className="prose prose-invert prose-sm max-h-24 overflow-hidden text-ellipsis"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {note.tags.map(tag => (
          <span key={tag} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">{tag}</span>
        ))}
      </div>
    </article>
  );
}

export default function TodayCanvasScreen({
  notes,
  query,
  onQueryChange,
  onSearchFocus,
  suggestedQuestions,
  isLoadingSuggestions,
  suggestionError,
  generatedAnswer,
  onNewNote,
  onNavigate,
  activeNote,
  onNoteSelect,
}: TodayCanvasScreenProps) {
  const [editorContent, setEditorContent] = useState('');
  const [isFabModalOpen, setIsFabModalOpen] = useState(false);

  const handleNewNoteClick = () => {
    onNewNote();
    setIsFabModalOpen(false);
  };

  const handleAttachmentClick = () => {
    toast.info('첨부파일 기능은 아직 구현되지 않았습니다.');
    setIsFabModalOpen(false);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
            <Home onClick={() => onNavigate('today')} className="cursor-pointer" />
            <h1 className="text-xl font-bold">Continuum</h1>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar
            q={query}
            setQ={onQueryChange}
            onFocus={onSearchFocus}
            suggestedQuestions={suggestedQuestions}
            isLoadingSuggestions={isLoadingSuggestions}
            suggestionError={suggestionError}
          />
          <button onClick={() => onNavigate('settings')} className="p-2 rounded-full hover:bg-gray-700">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-2 gap-4 p-4 overflow-y-auto">
        {/* Left Column: Note List / Search Results */}
        <div className="flex flex-col gap-4">
          {query.length > 0 ? (
            <div className="space-y-4">
              {generatedAnswer.isLoading && <div className="text-center text-gray-400 animate-pulse">AI 답변 생성 중...</div>}
              {generatedAnswer.error && <div className="text-center text-red-400">{generatedAnswer.error}</div>}
              {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} />}
              {notes.map(note => <NoteCard key={note.id} note={note} onSelect={onNoteSelect} isActive={note.id === activeNote?.id} />)}
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map(note => <NoteCard key={note.id} note={note} onSelect={onNoteSelect} isActive={note.id === activeNote?.id} />)}
            </div>
          )}
        </div>

        {/* Right Column: Editor */}
        <div className="h-full flex flex-col">
            <div className="flex-1 rounded-lg bg-gray-800/50 p-1">
                 <RichNoteEditor note={activeNote} autoFocus onSave={setEditorContent} />
            </div>
        </div>
      </div>

      {isFabModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end justify-center"
          onClick={() => setIsFabModalOpen(false)}
        >
          <div 
            className="bg-gray-800 p-4 rounded-t-2xl w-full max-w-md animate-slideInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-4 text-center">
              <button onClick={handleNewNoteClick} className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-700 transition-colors">
                <PenSquare size={28} className="mb-2" />
                <span>새 노트 작성</span>
              </button>
              <button onClick={handleAttachmentClick} className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-700 transition-colors">
                <FilePlus size={28} className="mb-2" />
                <span>첨부파일</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsFabModalOpen(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform duration-200 hover:scale-110`}>
        <Plus size={28} />
      </button>
    </div>
  );
}