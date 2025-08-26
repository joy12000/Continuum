import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { searchChunks } from "../lib/supabaseService";

const Today: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!query.trim()) { setResults([]); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const rows = await searchChunks(query, user.id);
      setResults(rows || []);
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleSelectRow(row: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("notes").select("*").eq("id", row.note_id).single();
    if (!error && data) {
      setSelectedNote(data);
      setEditedText(data.body || "");
    }
  }

  return (
    <div className="p-4 space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색어를 입력하세요"
        className="input input-bordered w-full"
      />
      <div className="space-y-2">
        {results.map((r, i) => (
          <button key={i} onClick={() => handleSelectRow(r)} className="block w-full text-left p-2 hover:bg-gray-100 rounded">
            <div className="text-xs opacity-60">score: {typeof r.distance === "number" ? r.distance.toFixed(3) : "-"}</div>
            <div className="line-clamp-2">{r.content}</div>
          </button>
        ))}
      </div>

      {selectedNote && (
        <div className="mt-4 p-3 border rounded">
          <div className="font-semibold mb-2">선택한 노트</div>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: editedText }} />
        </div>
      )}
    </div>
  );
};

export default Today;
