import React, { useState, useMemo, useCallback } from 'react';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toasts } from "./components/Toasts";
import TodayCanvasScreen from "./components/TodayCanvasScreen";
import { Settings } from "./components/Settings";
import Diagnostics from "./components/Diagnostics";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./lib/db";
import { Note } from "./types/common";

type View = 'today' | 'settings' | 'diagnostics';
type Engine = "auto" | "remote";

export default function App() {
  const [view, setView] = useState<View>('today');
  const [engine, setEngine] = useState<Engine>(() => (localStorage.getItem("semanticEngine") as Engine) || "auto");
  const [q, setQ] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const allNotes = useLiveQuery(() => db.notes.toArray(), []);
  const finalResults = useMemo(() => {
    if (!allNotes) return [];
    if (!q) return allNotes;
    // 임시 검색 로직: 실제 검색 로직은 나중에 구현
    return allNotes.filter((note: Note) => note.content.includes(q));
  }, [allNotes, q]);

  const handleSearchFocus = useCallback(async () => {
    if (suggestedQuestions.length > 0 || isLoadingSuggestions) {
      return; // 이미 제안이 있거나 로딩 중이면 중복 호출 방지
    }

    setIsLoadingSuggestions(true);
    setSuggestionError(null);
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
      console.error("Failed to fetch suggestions:", error);
      setSuggestionError("질문 제안에 실패했습니다.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [suggestedQuestions, isLoadingSuggestions]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-3 sm:p-6 flex flex-col gap-6">
        <TodayCanvasScreen 
          onNavigate={setView} 
          q={q} 
          setQ={setQ} 
          finalResults={finalResults}
          onSearchFocus={handleSearchFocus}
          suggestedQuestions={suggestedQuestions}
          isLoadingSuggestions={isLoadingSuggestions}
          suggestionError={suggestionError}
        />
        <Toasts />
      </div>
    </ErrorBoundary>
  );
}