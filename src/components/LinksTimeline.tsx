import React, { useEffect, useMemo, useRef, useState } from "react";
// Defensive local types so it compiles even if your project types differ.
type Id = number | string;

interface Note {
  id: Id;
  title?: string;
  content: string;
  tags?: string[];
  createdAt?: number; // epoch ms
  updatedAt?: number; // epoch ms
}

interface Embedding { noteId: Id; vector: number[] }

// Try to import your Dexie instance if it exists; fall back to no-op.
let db: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  db = require("../lib/db").default || require("../lib/db");
} catch { /* optional */ }

// Compute connections
import { rankConnections, type RankedEdge } from "../lib/graph/computeConnections";

// Utilities
const fmtDate = (ms?: number) => {
  if (!ms) return "Unknown";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

type Grouped = Record<string, Note[]>;

/**
 * LinksTimeline
 * Horizontal timeline (days -> columns). Each note shows top related notes as chips.
 * Does NOT require routing changes by itself; export default to add to your router.
 */
const LinksTimeline: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [embeds, setEmbeds] = useState<Embedding[]>([]);
  const [edgesByNote, setEdgesByNote] = useState<Record<string, RankedEdge[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Load from Dexie if available; otherwise bail with empty set
        let allNotes: Note[] = [];
        let allEmbeds: Embedding[] = [];
        if (db?.notes) {
          allNotes = await db.notes.toArray();
        }
        if (db?.embeddings) {
          allEmbeds = await db.embeddings.toArray();
        }
        if (!mounted) return;
        setNotes(allNotes);
        setEmbeds(allEmbeds);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Group by date (YYYY-MM-DD)
  const grouped: Grouped = useMemo(() => {
    const g: Grouped = {};
    for (const n of notes) {
      const key = fmtDate(n.createdAt || n.updatedAt || Date.now());
      if (!g[key]) g[key] = [];
      g[key].push(n);
    }
    // sort each day by time asc
    Object.keys(g).forEach(k => g[k].sort((a, b) => (a.createdAt||0) - (b.createdAt||0)));
    return g;
  }, [notes]);

  const days = useMemo(() => {
    const keys = Object.keys(grouped).sort(); // chronological
    return keys;
  }, [grouped]);

  // Pre-compute edges for visible notes (simple precompute for all)
  useEffect(() => {
    if (!notes.length) return;
    const map: Record<string, RankedEdge[]> = {};
    for (const n of notes) {
      map[String(n.id)] = rankConnections(n, notes, embeds, { k: 3 });
    }
    setEdgesByNote(map);
  }, [notes, embeds]);

  if (loading) {
    return <div className="p-6 text-center text-sm opacity-80">불러오는 중…</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-500 text-sm">오류: {error}</div>;
  }
  if (!notes.length) {
    return <div className="p-6 text-center text-sm opacity-80">표시할 노트가 없습니다.</div>;
  }

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-hidden" ref={scrollerRef}>
      <div className="flex items-start gap-6 p-6 min-h-[60vh]">
        {days.map((day) => (
          <div key={day} className="min-w-[260px] max-w-[320px] flex-shrink-0">
            <div className="sticky top-0 z-10 px-2 py-1 mb-2 rounded-md bg-slate-800/60 text-slate-100 text-xs tracking-wide">
              {day}
            </div>
            <div className="flex flex-col gap-4">
              {grouped[day].map((note) => (
                <article key={String(note.id)} className="rounded-2xl bg-slate-800/40 border border-slate-700/60 p-3">
                  <header className="mb-2">
                    <h3 className="text-slate-100 text-sm font-semibold line-clamp-2">{note.title || (note.content?.slice(0, 48) || "제목 없음")}</h3>
                    <div className="text-[11px] text-slate-400 mt-1">{fmtDate(note.createdAt || note.updatedAt)}</div>
                  </header>
                  <p className="text-slate-300 text-[13px] leading-snug line-clamp-4 whitespace-pre-wrap">
                    {note.content?.slice(0, 200)}
                  </p>
                  {edgesByNote[String(note.id)]?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {edgesByNote[String(note.id)].map((e) => (
                        <button
                          key={String(e.toId)}
                          className="text-xs bg-indigo-500/15 border border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-500/20 text-indigo-200 px-2.5 py-1 rounded-full transition"
                          title={`연결 점수 ${e.score.toFixed(2)}`}
                          onClick={() => {
                            // naive "follow link": scroll to the day containing the target if present
                            const target = document.querySelector(`[data-note-id='${String(e.toId)}']`) as HTMLElement | null;
                            target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                          }}
                        >
                          ↗︎ #{String(e.toId)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <footer className="mt-2">
                    <span className="text-[10px] text-slate-500">tags: {(note.tags||[]).slice(0,3).join(", ")}</span>
                  </footer>
                  <div data-note-id={String(note.id)} />
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinksTimeline;