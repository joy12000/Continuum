
import { useState } from "react";
import { db } from "../lib/db";

type ApiState = 'idle' | 'loading' | 'error';

export function SearchBar({ q, setQ }: { q: string; setQ: (v: string) => void }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [apiState, setApiState] = useState<ApiState>('idle');

  async function handleFocus() {
    if (apiState !== 'idle' || suggestions.length > 0) {
      return; // Prevent multiple calls or re-fetching if suggestions already exist
    }

    setApiState('loading');
    try {
      const recentNotes = await db.notes.orderBy('updatedAt').reverse().limit(5).toArray();
      if (recentNotes.length === 0) {
        setApiState('idle');
        return;
      }

      const notesContent = recentNotes.map(n => n.content.replace(/<[^>]+>/g, '')).join('\n\n---\n\n');

      const prompt = `Based on the following notes, generate 3 interesting and distinct questions a user might ask.
Return the result as a single, valid JSON object with a "questions" key containing an array of strings. Example: {"questions": ["Question 1?", "Question 2?", "Question 3?"]}

NOTES:
---
${notesContent}
---
`;

      const response = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt }) // Sending the new prompt structure
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const result = await response.json();
      
      if (result && Array.isArray(result.questions)) {
        setSuggestions(result.questions);
      } else {
        // Handle cases where the JSON is valid but doesn't match the expected structure
        throw new Error('Invalid JSON structure received');
      }

      setApiState('idle');
    } catch (error) {
      console.error("Failed to get suggestions:", error);
      setApiState('error');
      setTimeout(() => {
        setApiState('idle');
      }, 2000); // Reset after 2 seconds
    }
  }

  return (
    <div className="space-y-2">
      <input
        className="input"
        placeholder="검색 또는 클릭하여 질문 제안받기"
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={handleFocus}
      />
      <div className="flex flex-wrap gap-2">
        {apiState === 'loading' && <span className="text-sm text-slate-400">질문 생성 중...</span>}
        {apiState === 'error' && <span className="text-sm text-red-400">질문 제안에 실패했습니다.</span>}
        {suggestions.map((s, i) => (
          <button key={i} className="btn-sm bg-slate-700" onClick={() => setQ(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
