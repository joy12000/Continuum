import React, { useState, useMemo } from 'react';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toasts } from "./components/Toasts";
import TodayCanvasScreen from "./components/TodayCanvasScreen";
import { Settings } from "./components/Settings";
import Diagnostics from "./components/Diagnostics";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Note } from "./lib/db";

type View = 'today' | 'settings' | 'diagnostics';
type Engine = "auto" | "remote";

export default function App() {
  const [view, setView] = useState<View>('today');
  const [engine, setEngine] = useState<Engine>(() => (localStorage.getItem("semanticEngine") as Engine) || "auto");
  const [q, setQ] = useState('');

  const allNotes = useLiveQuery(() => db.notes.toArray(), []);
  const finalResults = useMemo(() => {
    if (!allNotes) return [];
    if (!q) return allNotes;
    // 임시 검색 로직: 실제 검색 로직은 나중에 구현
    return allNotes.filter((note: Note) => note.content.includes(q));
  }, [allNotes, q]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-3 sm:p-6 flex flex-col gap-6">
        <TodayCanvasScreen onNavigate={setView} q={q} setQ={setQ} finalResults={finalResults} />
        <Toasts />
      </div>
    </ErrorBoundary>
  );
}