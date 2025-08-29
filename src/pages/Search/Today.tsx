import React, { useEffect, useState } from "react";
import { searchChunks } from "@/lib/search/searchChunks";
import { getQueryEmbedding } from "@/lib/embeddings/getQueryEmbedding";

export default function Today() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query?.trim()) { setResults([]); return; }
    (async () => {
      try {
        setLoading(true);
        const qEmb = await getQueryEmbedding(query);
        const r = await searchChunks({ qEmb, limit: 12 });
        setResults(r);
      } finally {
        setLoading(false);
      }
    })();
  }, [query]);

  return (
    <div className="p-4">
      <div className="mb-3 flex gap-2">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="검색어를 입력하세요…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="rounded bg-black px-3 py-2 text-white" disabled={loading}>
          {loading ? "검색중…" : "검색"}
        </button>
      </div>
      <div className="space-y-2">
        {results.map((r) => (
          <div key={r.note_id + "-" + r.chunk_index} className="rounded border p-2">
            <div className="text-sm text-neutral-500">dist: {(r.distance ?? r.score)?.toFixed?.(4)}</div>
            <div className="font-medium">{r.note?.title || r.note_id}</div>
            <div className="text-sm">{r.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
