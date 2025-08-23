import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  q: string;
  setQ: (v: string) => void;
  onFocus: () => void;
  suggestedQuestions: string[];
  isLoadingSuggestions: boolean;
  suggestionError: string | null;
  isModelReady: boolean;
  modelStatus: string;
}

export function SearchBar({
  q, setQ, onFocus, suggestedQuestions, isLoadingSuggestions, suggestionError, isModelReady, modelStatus
}: SearchBarProps) {
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
          onFocus={onFocus}
          placeholder={isModelReady ? "Ask your past self..." : modelStatus}
          className="w-full p-3 pl-10 bg-surface-2 text-text-primary rounded-lg shadow-sm focus:ring-2 focus:ring-accent focus:outline-none transition disabled:opacity-50"
          disabled={!isModelReady}
        />
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