import React from 'react';
import { Search, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  q: string;
  setQ: (v: string) => void;
  onSearch: () => void;
  onFocus: () => void;
  suggestedQuestions: string[];
  isLoadingSuggestions: boolean;
  suggestionError: string | null;
  isModelReady: boolean;
  modelStatus: string;
  className?: string;
}

export function SearchBar({
  q, setQ, onSearch, onFocus, suggestedQuestions, isLoadingSuggestions, suggestionError, isModelReady, modelStatus, className
}: SearchBarProps) {

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={isModelReady ? "과거의 나에게 무엇이든 물어보세요..." : modelStatus}
          className={`w-full p-3 pl-10 pr-12 bg-white text-slate-900 rounded-2xl shadow-sm border border-slate-200 focus:ring-2 focus:ring-sky-400 focus:outline-none transition disabled:opacity-50 ${className}`}
          disabled={!isModelReady}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            onClick={onSearch}
            className="p-1.5 bg-white hover:bg-slate-50 rounded-full text-slate-500 hover:text-slate-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 border border-slate-200"
            aria-label="Search"
            disabled={!isModelReady}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-2 text-center">
        {isLoadingSuggestions && (
          <div className="text-sm text-slate-500 animate-pulse">
            Generating suggestions...
          </div>
        )}

        {!isLoadingSuggestions && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setQ(question)}
                className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
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
