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
          <Search className="h-5 w-5 text-text-secondary" />
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={isModelReady ? "과거의 나에게 무엇이든 물어보세요..." : modelStatus}
          className={`w-full p-3 pl-10 pr-12 bg-surface-2 text-text-primary rounded-full shadow-sm focus:ring-2 focus:ring-accent focus:outline-none transition disabled:opacity-50 ${className}`}
          disabled={!isModelReady}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            onClick={onSearch}
            className="p-1.5 bg-surface-2 hover:bg-surface-3 rounded-full text-text-secondary hover:text-text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Search"
            disabled={!isModelReady}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-2 text-center">
        {isLoadingSuggestions && (
          <div className="text-sm text-text-secondary animate-pulse">
            Generating suggestions...
          </div>
        )}

        {!isLoadingSuggestions && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setQ(question)}
                className="px-3 py-1 text-sm bg-surface-2 text-text-secondary rounded-lg hover:bg-surface transition"
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
