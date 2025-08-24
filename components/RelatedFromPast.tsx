import React, { useEffect, useMemo, useState } from "react";
import { db } from "../lib/db";
import { SemWorkerClient } from "../lib/semWorkerClient";
import { cosineSim } from "../lib/search/cosine";

type Card = { id: string; content: string; score: number; updatedAt: number; };

export default function RelatedFromPast({ seedText, limit = 3 }: { seedText: string; limit?: number; }) {
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = (seedText || "").replace(/<[^>]+>/g, "").trim();
      if (!text || text.length < 6) { setItems([]); return; }
      setLoading(true); setError(null);
      try {
        await SemWorkerClient.ensure();
        const [qvec] = await SemWorkerClient.embed([text]);
        const all = await db.embeddings.toArray();
        if (all.length === 0) { setItems([]); return; }
        const ranked = all.map(e => {
          const noteId = e.noteId;
          const n = (db as any).notes && noteId ? null : null;
          return { id: noteId, score: cosineSim(qvec, e.vec) };
        });
        ranked.sort((a,b)=>b.score-a.score);
        const top = ranked.slice(0, limit*3); // wider sample
        const notes = await db.notes.bulkGet(top.map(t=>t.id));
        const cards: Card[] = notes.map((n,i)=> n ? ({ id: n.id, content: n.content, score: top[i].score, updatedAt: n.updatedAt }) : null).filter(Boolean) as any;
        if (!cancelled) setItems(cards.slice(0, limit));
      } catch (e:any) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seedText, limit]);

  if (loading) return <div className="text-sm text-slate-400">관련 기록 찾는 중…</div>;
  if (error) return <div className="text-sm text-red-400">관련 기록 오류: {error}</div>;
  if (items.length===0) return null;

  return (
    <section className="space-y-2">
      <h4 className="font-semibold text-slate-200">Related from your past</h4>
      <div className="grid gap-2">
        {items.map(n => (
          <article key={n.id} className="rounded-xl border border-slate-700 p-3 hover:bg-slate-800">
            <div className="text-xs text-slate-400">{new Date(n.updatedAt).toLocaleString()}</div>
            <div className="line-clamp-2" dangerouslySetInnerHTML={{__html: n.content}}/>
            <div className="mt-2 text-[11px] text-slate-500">similarity {n.score.toFixed(3)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
