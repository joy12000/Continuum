'use client';
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
          <Search className="h-5 w-5 text-secondary-text" />
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={isModelReady ? "메모 검색..." : modelStatus}
          className={`w-full p-4 pl-12 pr-12 bg-surface text-foreground placeholder-muted rounded-[12px] focus:ring-2 focus:ring-primary focus:outline-none transition disabled:opacity-50 ${className}`}
          disabled={!isModelReady}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            onClick={onSearch}
            className="p-2 bg-surface hover:bg-border rounded-[8px] text-secondary-text hover:text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Search"
            disabled={!isModelReady}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-2 text-center">
        {isLoadingSuggestions && (
          <div className="text-[13px] text-secondary-text animate-pulse">
            Generating suggestions...
          </div>
        )}

        {!isLoadingSuggestions && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setQ(question)}
                className="px-[12px] py-[6px] text-[13px] font-medium bg-surface text-secondary-text rounded-[8px] hover:bg-border hover:text-foreground transition-colors"
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
