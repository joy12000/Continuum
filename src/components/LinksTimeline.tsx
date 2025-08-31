
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { computeConnections } from "../lib/graph/computeConnections";

import { ConnectionsBadge } from "./ConnectionsBadge";
import { ConnectionsPanel } from "./ConnectionsPanel";
import { ArrowUpRight } from 'lucide-react';
import "../styles/links-timeline.css";
import { supabase } from "../lib/supabase";
import { listNotes } from "../lib/supabaseService";

// Note type matching Supabase data
import { Note } from "../types/common";

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

const LinksTimeline: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNote, setHighlightedNote] = useState<string | number | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tagFilter, setTagFilter] = useState<string>("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [vecById, setVecById] = useState<Map<string, number[]>>(new Map());
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const supabaseNotes = await listNotes(user.id);
      const transformedNotes: Note[] = supabaseNotes.map((n: any) => ({
        id: n.id,
        title: n.title || '',
        content: n.body || '', // Map body to content
        tags: n.tags || [],
        createdAt: n.created_at ? new Date(n.created_at).getTime() : 0,
        updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : 0,
      }));
      setNotes(transformedNotes);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    window.addEventListener('notes:updated', fetchNotes);
    return () => {
      window.removeEventListener('notes:updated', fetchNotes);
    };
  }, [fetchNotes]);

  const filteredNotes = useMemo(() => {
    if (!tagFilter) return notes;
    return notes.filter(n => n.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase())));
  }, [notes, tagFilter]);

  const grouped: Grouped = useMemo(() => {
    const g: Grouped = {};
    for (const n of filteredNotes) {
      const key = fmtDate(n.createdAt || n.updatedAt || Date.now());
      if (!g[key]) g[key] = [];
      g[key].push(n);
    }
    Object.keys(g).forEach(k => g[k].sort((a, b) => (a.createdAt||0) - (b.createdAt||0)));
    return g;
  }, [filteredNotes]);

  const days = useMemo(() => {
    const keys = Object.keys(grouped);
    return sortOrder === 'asc' ? keys.sort() : keys.sort().reverse();
  }, [grouped, sortOrder]);

  

  const weights = { citation: 1.0, sim: 0.6, tag: 0.2 } as const;

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
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b border-slate-700/60 flex items-center gap-4">
        <input
          type="text"
          placeholder="태그로 필터링"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="bg-slate-800/60 border border-slate-700/60 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          className="bg-slate-800/60 border border-slate-700/60 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="desc">최신순</option>
          <option value="asc">오래된순</option>
        </select>
      </div>
      <div className="w-full h-full overflow-x-auto overflow-y-hidden links-timeline-flex" ref={scrollerRef}>
        <div className="flex items-start gap-6 p-6 min-h-[60vh] links-timeline-grid">
          {days.map((day) => (
            <div key={day} className="min-w-[260px] max-w-[320px] flex-shrink-0">
              <div className="sticky top-0 z-10 px-2 py-1 mb-2 rounded-md bg-slate-800/60 text-slate-100 text-xs tracking-wide">
                {day}
              </div>
              <div className="flex flex-col gap-4">
                {grouped[day].map((note) => {
                  const neighbors = computeConnections(note, notes, new Map(), weights, 3)
                    .map(n => ({ ...n, title: notes.find(x => x.id === n.toId)?.title }));
                  const isOpen = openPanelId === note.id;
                  const navigateToNote = (id: string | number) => console.log("Navigating to note:", id);
                  return (
                    <article key={String(note.id)} className={`rounded-2xl bg-slate-800/40 border border-slate-700/60 p-3 transition-all duration-500 ${highlightedNote === note.id ? 'bg-indigo-500/20' : ''}`}>
                      <header className="mb-2 flex justify-between items-start">
                        <h3 className="text-slate-100 text-sm font-semibold line-clamp-2 flex-grow cursor-pointer" onClick={()=>window.dispatchEvent(new CustomEvent("open:note",{ detail:{ id:note.id } }))}>{note.title || (note.content?.slice(0, 48) || "제목 없음")}</h3>
                        <button onClick={()=>window.dispatchEvent(new CustomEvent("open:note",{ detail:{ id:note.id } }))} className="p-1 hover:text-accent transition-colors flex-shrink-0">
                            <ArrowUpRight size={18} />
                        </button>
                      </header>
                      <p className="text-slate-300 text-[13px] leading-snug line-clamp-4 whitespace-pre-wrap">
                        {note.content?.slice(0, 200)}
                      </p>
                      <div className="mt-2">
                        <ConnectionsBadge count={neighbors.length} onClick={() => setOpenPanelId(isOpen ? null : String(note.id))} />
                        {isOpen && (
                          <ConnectionsPanel
                            neighbors={neighbors}
                            onSelect={(id) => navigateToNote(id)}
                          />
                        )}
                      </div>
                      <footer className="mt-2">
                        <span className="text-xs text-slate-400">tags: {(note.tags||[]).slice(0,3).join(", ")}</span>
                      </footer>
                      <div data-note-id={String(note.id)} />
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LinksTimeline;
