import React, { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { SearchBar } from './SearchBar';
import { RichNoteEditor } from './RichNoteEditor';
import { Plus, Sun, Moon, Search } from 'lucide-react';
import { GeneratedAnswer } from './GeneratedAnswer';

type Theme = 'light' | 'dark' | 'system';
type View = 'today' | 'settings' | 'diagnostics';

interface AnswerData {
  answerSegments: {
    sentence: string;
    sourceNoteId: string;
  }[];
  sourceNotes: string[];
}

interface Note {
  id: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export default function TodayCanvasScreen({ onNavigate, q, setQ, finalResults }: { onNavigate: Dispatch<SetStateAction<View>>; q: string; setQ: (v: string) => void; finalResults: Note[]; }) {
  // 1. State 정의
  const [scrollY, setScrollY] = useState(0);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [editorCharCount, setEditorCharCount] = useState(0);
  const [theme, setTheme] = useState<Theme>('system');
  const [fontSize, setFontSize] = useState(16);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [generatedAnswer, setGeneratedAnswer] = useState<{
    data: AnswerData | null;
    isLoading: boolean;
    error: string | null;
  }>({ data: null, isLoading: false, error: null });

  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // Theme 처리 로직
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
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

// 스크롤 및 휠 이벤트 로직
const handleScroll = useCallback(() => {
  setScrollY(window.scrollY);
  if (window.scrollY > 20) {
    setIsSearchVisible(true);
  }
}, []);

const handleWheel = useCallback((e: WheelEvent) => {
  if (window.scrollY === 0 && e.deltaY < 0) {
    setIsSearchVisible(true);
  }
}, []);

useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('wheel', handleWheel);
  return () => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('wheel', handleWheel);
  };
}, [handleScroll, handleWheel]);

const handleSearchBarFocus = useCallback(async () => {
  if (isLoadingSuggestions) return;

  setIsLoadingSuggestions(true);
  try {
    const prompt = "Generate 3 interesting and distinct questions a user might ask about general knowledge. Return the result as a single, valid JSON object with a \"questions\" key containing an array of strings. Example: {\"questions\": [\"Question 1?\"]}";
    const response = await fetch('/.netlify/functions/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const result = await response.json();
    if (result && Array.isArray(result.questions)) {
      setSuggestedQuestions(result.questions);
    } else {
      throw new Error('Invalid JSON structure received');
    }
  } catch (error) {
    console.error("Failed to get suggestions:", error);
    setSuggestedQuestions([]); // Clear suggestions on error
  } finally {
    setIsLoadingSuggestions(false);
  }
}, [isLoadingSuggestions]);

// RAG 답변 생성 로직
useEffect(() => {
  if (!q) {
    setGeneratedAnswer({ data: null, isLoading: false, error: null });
    return;
  }

  setGeneratedAnswer(prev => ({ ...prev, isLoading: true, error: null }));

  const generateAnswer = async () => {
    try {
      const notesContent = finalResults.map(n => n.content.replace(/<[^>]+>/g, '')).join('\n\n---\n\n');
      const prompt = `Based on the following notes, answer the question: "${q}".\nReturn the result as a single, valid JSON object with an "answerSegments" key containing an array of objects, each with a "sentence" and "sourceNoteId" key, and a "sourceNotes" key containing an array of strings. Example: {"answerSegments": [{"sentence": "Answer part 1.", "sourceNoteId": "note1"}], "sourceNotes": ["note1"]}\n\nNOTES:\n---\n${notesContent}\n---
`;

      const response = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const result = await response.json();
      if (result && Array.isArray(result.answerSegments) && Array.isArray(result.sourceNotes)) {
        setGeneratedAnswer({ data: result, isLoading: false, error: null });
      } else {
        throw new Error('Invalid JSON structure received');
      }
    } catch (error) {
      console.error("Failed to generate answer:", error);
      setGeneratedAnswer({ data: null, isLoading: false, error: '답변을 생성하는 데 실패했습니다.' });
    }
  };

  generateAnswer();
}, [q, finalResults]);

return (

  <div className="bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300" style={{ fontSize: `${fontSize}px` }}>
    {/* 검색창 배경 (Backdrop) */}
    {isSearchVisible && (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 animate-fadeIn motion-reduce:animate-none"
        onClick={() => setIsSearchVisible(false)}
      />
    )}

    {/* Header */}
    <header className={`sticky top-0 z-20 h-48 flex flex-col justify-end items-center p-4 transition-all duration-300 ease-out ${scrollY > 0 ? 'opacity-0' : 'opacity-100'}`}>
      <h1 className="text-xl font-semibold text-slate-500 dark:text-slate-400 opacity-80">{formattedDate}</h1>
      <div className="absolute top-4 right-4 flex items-center gap-2">
          <button onClick={() => setFontSize(f => f - 1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">-</button>
          <button onClick={() => setFontSize(f => f + 1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">+</button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <Sun className="h-5 w-5 dark:hidden" />
            <Moon className="h-5 w-5 hidden dark:block" />
          </button>
          <button onClick={() => setIsSearchVisible(true)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <Search className="h-5 w-5" />
          </button>
      </div>
    </header>

    {/* SearchBar */}
    <div className={`sticky top-0 z-20 transition-all duration-300 ease-out ${isSearchVisible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
      <SearchBar 
        q={q} 
        setQ={setQ} 
        onFocus={handleSearchBarFocus}
        suggestedQuestions={suggestedQuestions}
        isLoadingSuggestions={isLoadingSuggestions}
      />
    </div>

    {/* AI 답변 영역 */}
    <div className="mb-4 px-4 sm:px-0">
      {generatedAnswer.isLoading && (
        <div className="text-center text-slate-500 animate-pulse">AI가 답변을 생성 중입니다...</div>
      )}
      {generatedAnswer.error && (
        <div className="text-center text-red-500">{generatedAnswer.error}</div>
      )}
      {generatedAnswer.data && !generatedAnswer.isLoading && (
        <GeneratedAnswer data={generatedAnswer.data} />
      )}
    </div>

    {/* Main (Editor 영역) */}
    <main className="px-4 sm:px-10 pb-20">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg p-10">
        <RichNoteEditor 
          autoFocus 
          onSave={(content) => setEditorCharCount(content.length)}
        />
      </div>
      <div className="max-w-4xl mx-auto mt-2 px-2 flex justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>자동 저장됨</span>
          <span>{editorCharCount > 0 ? editorCharCount.toString().split(/\s+/).length : 0} 단어 / {editorCharCount} 글자</span>
      </div>
    </main>

    {/* FAB */}
    <button className={`fixed bottom-4 right-4 sm:bottom-14 sm:right-14 h-11 w-11 sm:h-14 sm:w-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out ${editorCharCount >= 1 ? 'scale-100 animate-zoomIn' : 'scale-0'}`}>
      <Plus className="h-7 w-7" />
    </button>
  </div>
);
}