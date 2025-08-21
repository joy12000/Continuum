import React, { useState, useEffect, useCallback } from 'react';
import { SearchBar } from './SearchBar';
import { RichNoteEditor } from './RichNoteEditor';
import { Plus, Sun, Moon, Search } from 'lucide-react';
import { Note } from '../lib/db';
import { AnswerData } from '../types/common';
import { GeneratedAnswer } from './GeneratedAnswer';

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
}: TodayCanvasScreenProps) {
  // --- UI 상태 관리 ---
  const [scrollY, setScrollY] = useState(0);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [theme, setTheme] = useState<Theme>('system');
  const [fontSize, setFontSize] = useState(16);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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
    if (window.scrollY > 20 && !isSearchVisible) {
      setIsSearchVisible(true);
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

  // --- 렌더링 로직 ---
  const charCount = editorContent.length;
  const wordCount = editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;
  const showFab = charCount >= 1;
  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300" style={{ fontSize: `${fontSize}px` }}>
      {isSearchVisible && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 animate-fadeIn"
          onClick={() => setIsSearchVisible(false)}
        />
      )}

      <header className={`sticky top-0 z-20 h-48 flex flex-col justify-end items-center p-4 transition-all duration-300 ease-out ${scrollY > 0 ? 'opacity-0 -translate-y-4' : 'opacity-100'}`}>
        <h1 className="text-xl font-semibold text-slate-500 dark:text-slate-400 opacity-80">{formattedDate}</h1>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button onClick={() => setFontSize(f => Math.max(12, f - 1))} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">-</button>
          <button onClick={() => setFontSize(f => Math.min(24, f + 1))} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">+</button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <Sun className="h-5 w-5 dark:hidden" />
            <Moon className="h-5 w-5 hidden dark:block" />
          </button>
          <button onClick={() => setIsSearchVisible(true)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <Search className="h-5 w-5" />
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

      <main className="px-4 sm:px-10 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* --- 검색 결과 표시 영역 --- */}
          {query.length > 0 && (
            <div className="mb-4">
              {/* AI 요약 답변 */}
              {generatedAnswer.isLoading && <div className="text-center text-slate-500 animate-pulse">AI가 답변을 생성 중입니다...</div>}
              {generatedAnswer.error && <div className="text-center text-red-500">{generatedAnswer.error}</div>}
              {generatedAnswer.data && !generatedAnswer.isLoading && <GeneratedAnswer data={generatedAnswer.data} />}

              {/* 뷰 전환 및 노트 목록 */}
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
                         <div className="text-xs opacity-70 mb-2">{new Date(note.updatedAt).toLocaleString()}</div>
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
        </div>
        
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg p-10 shadow-sm mt-4">
          <RichNoteEditor 
            autoFocus 
            onSave={setEditorContent}
          />
        </div>
        <div className="max-w-4xl mx-auto mt-2 px-2 flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>자동 저장됨</span>
            <span>{wordCount} 단어 / {charCount} 글자</span>
        </div>
      </main>

      <button
        onClick={onNewNote}
        className={`fixed bottom-4 right-4 sm:bottom-14 sm:right-14 h-11 w-11 sm:h-14 sm:w-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out ${showFab ? 'scale-100 animate-zoomIn' : 'scale-0'}`}>
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}