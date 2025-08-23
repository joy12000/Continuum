import React from 'react';
import { Search } from 'lucide-react';

// 1. Props: 부모 컴포넌트로부터 필요한 모든 데이터와 핸들러를 받습니다.
interface SearchBarProps {
  q: string;
  setQ: (v: string) => void;
  onFocus: () => void;
  suggestedQuestions: string[];
  isLoadingSuggestions: boolean;
  suggestionError: string | null;
}

export \1
// --- Zero-shot question suggestions on focus ---
const [qs, setQs] = React.useState<string[]>([]);
const onFocusSuggest = async () => {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "zero-shot-questions",
        schema: { type: "object", properties: { questions: { type: "array", items: { type: "string" } } }, required: ["questions"] }
      })
    });
    const j = await res.json();
    if (Array.isArray(j?.questions)) setQs(j.questions.slice(0,3));
  } catch(e){ console.error(e); }
};

  // 2. 내부 상태/로직 제거: 이 컴포넌트는 상태를 관리하거나 API를 호출하지 않습니다.
  \1
  {qs.length>0 && (
    <div className="mt-2 flex gap-2 flex-wrap">
      {qs.map((q, i)=>(<button key={i} className="px-2 py-1 border rounded-lg text-sm" onClick={()=>onQueryChange(q)}>{q}</button>))}
    </div>
  )}
<div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        \1 onFocus={onFocusSuggest}> setQ(e.target.value)}
          // 3. Input onFocus 연결: 부모로부터 받은 onFocus 핸들러를 연결합니다.
          onFocus={onFocus}
          placeholder="과거의 나에게 질문하기..."
          className="w-full p-3 pl-10 bg-white dark:bg-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
        />
      </div>

      {/* 4. 조건부 렌더링 */}
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
                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 transition"
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