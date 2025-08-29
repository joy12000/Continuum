import React, { useEffect, useMemo, useRef, useState } from "react";
import { searchChunks } from "@/lib/search/searchChunks";
import { getQueryEmbedding } from "@/lib/embeddings/getQueryEmbedding";
import { computeConnections } from "@/lib/graph/computeConnections";
import { getEmbeddingsMap } from "@/lib/embeddings/getEmbeddingsMap";
import { ConnectionsPanel } from "@/components/ConnectionsPanel";

type Note = { id: string; title?: string; body?: string; tags?: string[] };

export default function Today() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [vecById, setVecById] = useState<Map<string, number[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // TODO: 여기에 실제 노트 목록 로딩 로직을 넣어주세요.
    // setAllNotes([...])
  }, []);

  useEffect(() => {
    (async () => setVecById(await getEmbeddingsMap(allNotes)))();
  }, [allNotes]);

  useEffect(() => {
    if (!query?.trim()) { setResults([]); return; }
    (async () => {
      try {
        setLoading(true);
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        const qEmb = await getQueryEmbedding(query, { signal: ac.signal });
        const r = await searchChunks({ qEmb, limit: 12, signal: ac.signal });
        setResults(r);
      } catch (e: any) {
        if (e?.name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [query]);

  const neighbors = useMemo(() => {
    if (!selected) return [];
    return computeConnections(selected as any, allNotes as any, vecById, { citation: 1.0, sim: 0.6, tag: 0.2 }, 3)
      .map(n => ({ ...n, title: allNotes.find(x => x.id === n.toId)?.title }));
  }, [selected, allNotes, vecById]);

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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          {results.map(r => (
            <div key={`${r.note_id}-${r.chunk_index}`} className="rounded border p-2 hover:bg-neutral-50"
                onClick={() => setSelected(r.note || { id: r.note_id, title: r.note?.title, body: r.note?.body })}>
              <div className="text-sm text-neutral-500">score: {(r.score ?? r.distance)?.toFixed?.(4)}</div>
              <div className="font-medium">{r.note?.title || r.note_id}</div>
              <div className="text-sm">{r.content}</div>
            </div>
          ))}
        </div>
        <aside>
          {selected && (
            <div className="rounded-lg border p-3">
              <div className="mb-1 text-sm text-neutral-500">{selected.id}</div>
              <h3 className="mb-2 text-lg font-semibold">{selected.title}</h3>
              <p className="whitespace-pre-wrap text-sm">{selected.body}</p>
              <div className="mt-4">
                <ConnectionsPanel neighbors={neighbors} onSelect={(id) => { if (typeof window !== "undefined") window.location.href = `/notes/${id}`; }} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
