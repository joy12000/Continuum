import { useEffect, useMemo, useState } from "react";
import { db, Note, Embedding } from "./lib/db";
import { liveQuery } from "dexie";
import { RichNoteEditor } from "./components/RichNoteEditor";
import { RecallCards } from "./components/RecallCards";
import { SearchBar } from "./components/SearchBar";
import { BM25 } from "./lib/search/bm25";
import { rrfFuse } from "./lib/search/rrf";
import { AttachmentGallery } from "./components/AttachmentGallery";
import { get as kvGet, keys as kvKeys, del as kvDel, createStore as kvCreateStore } from "idb-keyval";
import { Settings } from "./components/Settings";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toasts } from "./components/Toasts";
import { ModelStatus } from "./components/ModelStatus";
import { SemWorkerClient } from "./lib/semWorkerClient";
import Diagnostics from "./components/Diagnostics";
import { requestNotificationPermission } from "./lib/notifications";
import { cosineSim } from "./lib/search/cosine";

const sharedStore = kvCreateStore("continuum-shared", "queue");

type View = 'main' | 'settings' | 'diagnostics';
type Engine = "auto" | "remote";

function useLiveNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    async function drain() {
      const allKeys = await kvKeys(sharedStore);
      const shareKeys = allKeys.filter(k => typeof k === "string" && k.startsWith("share:"));
      if (shareKeys.length === 0) return;
      for (const key of shareKeys as string[]) {
        const item: any = await kvGet(key, sharedStore);
        if (!item) continue;
        const now = item.when || Date.now();
        const { title, text, url: sharedUrl } = item;
        const content = [title, text, sharedUrl].filter(Boolean).join("\n\n").trim();
        const id = crypto.randomUUID();
        await db.notes.add({ id, content, createdAt: now, updatedAt: now, tags: ["shared"] });
        if (Array.isArray(item.files) && item.files.length > 0) {
          await db.attachments.bulkAdd(item.files.map((f: any) => ({
            id: crypto.randomUUID(), noteId: id, name: f.name, type: f.type, blob: f.blob
          })));
        }
        await kvDel(key, sharedStore);
      }
    }
    drain();
    navigator.serviceWorker?.addEventListener("message", (ev: any) => {
      if (ev.data?.type === "shared-queue") drain();
    });
  }, []);
  useEffect(() => {
    const sub = liveQuery(() => db.notes.orderBy("updatedAt").reverse().toArray()).subscribe({
      next: setNotes, error: (e) => console.error("liveQuery error", e)
    });
    return () => sub.unsubscribe();
  }, []);
  return notes;
}

export default function App() {
  const semWorker = useMemo(() => new SemWorkerClient(), []);
  const notes = useLiveNotes();
  const [q, setQ] = useState("");
  const [engine, setEngine] = useState<Engine>((localStorage.getItem("semanticEngine") as any) || "auto");
  const [view, setView] = useState<View>('main');
  const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined);

  useEffect(() => {
    const setupNotifications = async () => {
      const swRegistration = await navigator.serviceWorker?.ready;
      const supportsPeriodicSync = swRegistration && 'periodicSync' in swRegistration;
      if ('serviceWorker' in navigator && 'PushManager' in window && supportsPeriodicSync) {
        const permission = await requestNotificationPermission();
        if (permission === 'granted') {
          try {
            await (swRegistration as any).periodicSync.register('daily-lookback', { minInterval: 24 * 60 * 60 * 1000 });
          } catch (e) { console.error('Periodic sync registration failed', e); }
        }
      }
    };
    setupNotifications();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const noteIdFromUrl = url.searchParams.get('note');
    if (noteIdFromUrl) {
      db.notes.get(noteIdFromUrl).then(note => {
        if (note) {
          setSelectedNote(note);
          history.replaceState(null, "", "/");
        }
      });
    }
    if (url.pathname === "/share") {
      const title = url.searchParams.get("title") || "";
      const text = url.searchParams.get("text") || "";
      const sharedUrl = url.searchParams.get("url") || "";
      const content = [title, text, sharedUrl].filter(Boolean).join("\n\n").trim();
      if (content) {
        const now = Date.now();
        db.notes.add({ id: crypto.randomUUID(), content, createdAt: now, updatedAt: now, tags: ["shared"] })
          .then(() => { history.replaceState(null, "", "/"); });
      } else {
        history.replaceState(null, "", "/");
      }
    }
  }, []);

  const bm25Index = useMemo(() => {
    const idx = new BM25();
    for (const n of notes) {
      idx.add({ id: n.id!, text: [n.content, n.tags.join(" ")].join(" ") });
    }
    idx.build();
    return idx;
  }, [notes]);

  useEffect(() => {
    (async () => {
      if (notes.length === 0) return;
      await semWorker.ensure(engine);
      const existing = new Set((await db.embeddings.toArray()).map(e => e.noteId));
      const toEmbed = notes.filter(n => n.id && !existing.has(n.id));
      if (toEmbed.length === 0) return;
      const vecs = await semWorker.embed(engine, toEmbed.map(n => [n.content, n.tags.join(" ")].join(" ")));
      await db.embeddings.bulkPut(toEmbed.map((n, i) => ({ noteId: n.id!, vec: vecs[i] })));
    })();
  }, [notes, engine, semWorker]);

  const [finalResults, setFinalResults] = useState<Note[]>(notes);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!q.trim()) {
        setFinalResults(notes);
        return;
      }
      const bm = bm25Index.search(q).slice(0, 50);
      
      const [qVec] = await semWorker.embed(engine, [q]);
      const allEmbeddings = await db.embeddings.toArray();
      const sem: { id: string; score: number }[] = allEmbeddings
        .map((e: Embedding) => ({ id: e.noteId, score: cosineSim(qVec, e.vec) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      const noteMap = new Map(notes.map(n => [n.id, n]));
      const fused = rrfFuse([bm, sem]);
      if (cancelled) return;
      setFinalResults(fused.map(s => noteMap.get(s.id)!).filter(Boolean));
    })();
    return () => { cancelled = true; };
  }, [q, notes, bm25Index, engine, semWorker]);

  const handleNoteLinkClick = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) setSelectedNote(note);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-3 sm:p-6 flex flex-col gap-6">
        <header className="flex flex-col sm:flex-row gap-3 justify-between items-start">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-indigo-400">Continuum</h1>
            <ModelStatus engine={engine} />
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={() => setView('main')}>메인</button>
            <button className="btn" onClick={() => setView('settings')}>설정</button>
          </div>
        </header>

        {view === 'main' && (
          <main className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <RichNoteEditor
                key={selectedNote?.id || 'new'}
                note={selectedNote}
                onSaved={() => setSelectedNote(undefined)}
                onNoteLinkClick={handleNoteLinkClick}
              />
              <SearchBar q={q} setQ={setQ} />
              <RecallCards notes={finalResults} onClickTag={(t) => setQ(`tag:${t}`)} setQuery={setQ} />
            </div>
            <div className="space-y-6">
              <AttachmentGallery noteId={selectedNote?.id} />
            </div>
          </main>
        )}

        {view === 'settings' && (
          <Settings onChange={setEngine} onNavigateToDiagnostics={() => setView('diagnostics')} />
        )}

        {view === 'diagnostics' && (
          <Diagnostics onBack={() => setView('settings')} />
        )}
        
        <Toasts />
      </div>
    </ErrorBoundary>
  );
}