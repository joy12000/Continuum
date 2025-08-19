import { useEffect, useMemo, useState } from "react";
import { db, Note } from "./lib/db";
import { liveQuery } from "dexie";
import { RichNoteEditor } from "./components/RichNoteEditor";
import { RecallCards } from "./components/RecallCards";
import { SearchBar } from "./components/SearchBar";
import { BM25 } from "./lib/search/bm25";
import { rrfFuse } from "./lib/search/rrf";
import { BackupRestore } from "./components/BackupRestore";
import { AttachmentGallery } from "./components/AttachmentGallery";
import { get as kvGet, keys as kvKeys, del as kvDel, createStore as kvCreateStore } from "idb-keyval";
import { Settings } from "./components/Settings";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toasts } from "./components/Toasts";
import { ModelStatus } from "./components/ModelStatus";
import { cosineSim } from "./lib/search/cosine";
import { SemWorkerClient } from "./lib/semWorkerClient";

const sharedStore = kvCreateStore("continuum-shared", "queue");

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
        const content = [item.title, item.text, item.url].filter(Boolean).join("\n\n").trim();
        const id = crypto.randomUUID();
        await db.notes.add({ id, content, createdAt: now, updatedAt: now, tags: ["shared"] });
        if (Array.isArray(item.files) && item.files.length > 0) {
          await db.attachments.bulkAdd(item.files.map((f: any) => ({
            id: crypto.randomUUID(),
            noteId: id,
            name: f.name,
            type: f.type,
            blob: f.blob
          })));
        }
        await kvDel(key, sharedStore);
      }
    }
    drain();

    navigator.serviceWorker?.addEventListener("message", (ev: any) => {
      if (ev.data?.type === "shared-queue") {
        drain();
      }
    });
  }, []);

  useEffect(() => {
    const sub = liveQuery(() => db.notes.orderBy("updatedAt").reverse().toArray())
      .subscribe({
        next: setNotes,
        error: (e) => console.error("liveQuery error", e)
      });
    return () => sub.unsubscribe();
  }, []);
  return notes;
}

export default function App() {
  const semWorker = useMemo(() => new SemWorkerClient(), []);
  const notes = useLiveNotes();
  const [q, setQ] = useState("");
  const [engine, setEngine] = useState<"auto" | "remote">((localStorage.getItem("semanticEngine") as any) || "auto");

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.pathname === "/share") {
      const title = url.searchParams.get("title") || "";
      const text = url.searchParams.get("text") || "";
      const sharedUrl = url.searchParams.get("url") || "";
      const content = [title, text, sharedUrl].filter(Boolean).join("\n\n").trim();
      if (content) {
        const now = Date.now();
        db.notes.add({ id: crypto.randomUUID(), content, createdAt: now, updatedAt: now, tags: ["shared"] })
          .then(() => {
            history.replaceState(null, "", "/");
          });
      } else {
        history.replaceState(null, "", "/");
      }
    }
  }, []);

  const [semName, setSemName] = useState("…");

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
      const ensure = await semWorker.ensure(engine) as { name: string; ready: boolean };
      setSemName(ensure?.name || "semantic");
      const existing = new Set((await db.embeddings.toArray()).map(e => e.noteId));
      const toEmbed = notes.filter(n => n.id && !existing.has(n.id));
      if (toEmbed.length === 0) return;
      const vecs = await semWorker.embed(engine, toEmbed.map(n => [n.content, n.tags.join(" ")].join(" ")));
      await db.embeddings.bulkPut(toEmbed.map((n, i) => ({
        noteId: n.id!,
        vec: vecs[i]
      })));
    })();
  }, [notes, engine, semWorker]);

  const [finalResults, setFinalResults] = useState<Note[]>(notes);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!q.trim()) { setFinalResults(notes); return; }
      const bm = bm25Index.search(q, 50).map(x => ({ id: x.id }));
      const qvecs = await semWorker.embed(engine, [q]);
      const qvec = qvecs?.[0];

      const embs = await db.embeddings.toArray();
      const sims: { id: string; score: number }[] = [];
      for (const e of embs) {
        if (!qvec || !e.vec || e.vec.length === 0) continue;
        sims.push({ id: e.noteId, score: cosineSim(qvec, e.vec) });
      }
      sims.sort((a, b) => b.score - a.score);
      const simTop = sims.slice(0, 50).map(x => ({ id: x.id }));

      const fused = rrfFuse([bm, simTop], 60);
      const order = new Map(fused.map((x, i) => [x.id, i]));
      const sorted = [...notes].sort((a, b) => {
        const ra = order.get(a.id!) ?? 1e9;
        const rb = order.get(b.id!) ?? 1e9;
        return ra - rb;
      });
      if (!cancelled) setFinalResults(sorted);
    })();
    return () => { cancelled = true; };
  }, [q, notes, bm25Index, engine, semWorker]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Toasts />
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Continuum</h1>
        <div className="text-sm text-slate-400">
          오프라인·온디바이스 PWA · 시맨틱: <span className="font-mono">{semName}</span> · 엔진: <span className="font-mono">{engine}</span>
          <div><ErrorBoundary><ModelStatus engine={engine} /></ErrorBoundary></div>
        </div>
      </header>

      <RichNoteEditor />
      <SearchBar value={q} onChange={setQ} />
      <BackupRestore />
      <Settings onChange={setEngine} />
      <RecallCards notes={notes} onClickTag={(t) => setQ(t)} setQuery={setQ} />

      <section className="space-y-2">
        {finalResults.map(n => (
          <article key={n.id} className="card">
            <div className="text-xs opacity-70">
              {new Date(n.updatedAt).toLocaleString()}
            </div>
            <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: n.content }} />
            <AttachmentGallery noteId={n.id!} />
            {n.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {n.tags.map((t: string) => (
                  <button key={t} onClick={() => setQ(t)} className="px-2 py-1 rounded-lg bg-slate-700 text-xs hover:bg-slate-600">#{t}</button>
                ))}
              </div>
            )}
          </article>
        ))}
        {finalResults.length === 0 && (
          <div className="text-slate-400">검색 결과가 없습니다.</div>
        )}
      </section>

      <footer className="text-center text-sm text-slate-500 py-6">
        PWA가 자동 업데이트됩니다. 네트워크가 없을 때도 동작합니다.
      </footer>
    </div>
  );
}