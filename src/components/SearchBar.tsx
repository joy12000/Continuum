import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  q: string;
  setQ: (v: string) => void;
  onFocus: () => void;
  suggestedQuestions: string[];
  isLoadingSuggestions: boolean;
  suggestionError: string | null;
}

export function SearchBar({
  q, setQ, onFocus, suggestedQuestions, isLoadingSuggestions, suggestionError
}: SearchBarProps) {
  return (
    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={onFocus}
          placeholder="과거의 나에게 질문하기..."
          className="w-full p-3 pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
        />
      </div>

      <div className="mt-2 text-center">
        {isLoadingSuggestions && (
          <div className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
            질문 제안 중...
          </div>
        )}

        {!isLoadingSuggestions && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setQ(question)}
                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-900 rounded-lg hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 transition"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {suggestionError && !isLoadingSuggestions && (
          <div className="text-sm text-red-500">{suggestionError}</div>
        )}
      </div>
    </div>
  );
}