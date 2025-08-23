import React, { useState, useEffect, useCallback } from 'react';
import { SearchBar } from './SearchBar';
import { RichNoteEditor } from './RichNoteEditor';
import { Plus, Sun, Moon, Search, FilePlus, PenSquare } from 'lucide-react';
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
}: TodayCanvasScreenProps) {
  // --- UI 상태 관리 ---
  const [scrollY, setScrollY] = useState(0);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [theme, setTheme] = useState<Theme>('system');
  const [fontSize, setFontSize] = useState(16);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isFabModalOpen, setIsFabModalOpen] = useState(false);

  // --- 테마 처리 로직 ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      document.documentElement.classList.toggle('dark', mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => document.documentElement.classList.toggle('dark', e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- 이벤트 핸들러 ---
  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
    if (window.scrollY > 50 && isSearchVisible) {
      setIsSearchVisible(false);
    }
  }, [isSearchVisible]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (window.scrollY === 0 && e.deltaY < 0 && !isSearchVisible) {
      setIsSearchVisible(true);
    }
  }, [isSearchVisible]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('wheel', handleWheel);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [handleScroll, handleWheel]);

  const handleNewNoteClick = () => {
    onNewNote();
    setIsFabModalOpen(false);
  };

  const handleAttachmentClick = () => {
    toast.info('첨부파일 기능은 아직 구현되지 않았습니다.');
    setIsFabModalOpen(false);
  };

  // --- 렌더링 로직 ---
  const charCount = editorContent.length;
  const wordCount = editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;
  const showFab = charCount >= 1;
  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <div className="flex flex-col h-full">
      {isSearchVisible && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 animate-fadeIn"
          onClick={() => setIsSearchVisible(false)}
        />
      )}

      <header className="flex items-center justify-between p-4 sm:px-0">
        <h1 
          className="text-xl font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
          onClick={() => onNavigate('today')}
        >
          Continuum 🛡️
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setFontSize(f => Math.max(12, f - 1))} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">-</button>
          <button onClick={() => setFontSize(f => Math.min(24, f + 1))} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">+</button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <Sun className="h-5 w-5 dark:hidden" />
            <Moon className="h-5 w-5 hidden dark:block" />
          </button>
          <button onClick={() => setIsSearchVisible(true)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="설정으로 이동"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className={`sticky top-0 z-20 transition-all duration-300 ease-out ${isSearchVisible ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <SearchBar
          q={query}
          setQ={onQueryChange}
          onFocus={onSearchFocus}
          suggestedQuestions={suggestedQuestions}
          isLoadingSuggestions={isLoadingSuggestions}
          suggestionError={suggestionError}
        />
      </div>

      <main className="p-4 sm:px-6 pb-20">
        <div className="max-w-4xl mx-auto space-y-4">
          {query.length > 0 && (
            <div className="card p-6">
              {generatedAnswer.isLoading && <div className="text-center text-slate-500 animate-pulse">AI가 답변을 생성 중입니다...</div>}
              {generatedAnswer.error && <div className="text-center text-red-500">{generatedAnswer.error}</div>}
              {generatedAnswer.data && !generatedAnswer.isLoading && <GeneratedAnswer data={generatedAnswer.data} />}

              {notes.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm font-semibold rounded-full ${viewMode === 'list' ? 'text-white bg-indigo-600' : 'text-slate-500 bg-slate-200'}`}>목록 뷰</button>
                    <button className="px-3 py-1 text-sm font-semibold text-slate-400 bg-slate-100 rounded-full cursor-not-allowed" disabled>타임라인 뷰 (예정)</button>
                    <button className="px-3 py-1 text-sm font-semibold text-slate-400 bg-slate-100 rounded-full cursor-not-allowed" disabled>그래프 뷰 (예정)</button>
                  </div>
                  <section className="space-y-2">
                    {notes.map(note => (
                      <article key={note.id} className="card bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
                         <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{new Date(note.updatedAt).toLocaleString()}</div>
                         <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: note.content }} />
                      </article>
                    ))}
                  </section>
                </div>
              )}
              
              {!generatedAnswer.isLoading && notes.length === 0 && (
                <div className="text-center text-slate-400 py-8">검색 결과가 없습니다.</div>
              )}
            </div>
          )}
        
          <div className="card p-6">
            <RichNoteEditor 
              autoFocus 
              onSave={setEditorContent}
            />
          </div>
          <div className="mt-2 px-2 flex justify-between text-xs text-slate-400 dark:text-slate-400">
              <span>자동 저장됨</span>
              <span>{wordCount} 단어 / {charCount} 글자</span>
          </div>
        </div>
      </main>

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
        className={`fixed bottom-4 right-4 sm:bottom-14 sm:right-14 h-11 w-11 sm:h-14 sm:w-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out ${showFab ? 'scale-100 animate-zoomIn' : 'scale-0'}`}>
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}