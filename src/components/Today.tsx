import React from "react";
import { useSearch } from "../hooks/useSearch";
import Highlight from "./Highlight";

const Today: React.FC = () => {
  const { query, setQuery, results, loading } = useSearch();

  function handleSelectRow(row: any) {
    window.dispatchEvent(new CustomEvent('open:note', { detail: { id: row.note_id } }));
  }

  return (
    <div className="p-4 space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색어를 입력하세요"
        className="input input-bordered w-full"
      />
      {loading && <div className="text-center p-4">검색 중...</div>}
      <div className="space-y-2">
        {results.map((r, i) => (
          <button key={`${r.note_id}-${i}`} onClick={() => handleSelectRow(r)} className="block w-full text-left p-2 hover:bg-gray-100 rounded">
            <div className="text-xs opacity-60">score: {typeof r.score === "number" ? r.score.toFixed(3) : "-"}</div>
            <div className="line-clamp-2">
              <Highlight text={r.content} query={query} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Today;