import React, { useEffect, useMemo, useState } from "react";
import { db, Note, Attachment } from "../lib/db";

export default function NotesScreen({ onNoteSelect, onNewNote }:{ onNoteSelect: (id:string)=>void; onNewNote: ()=>void; }){
  const [notes, setNotes] = useState<Note[]>([]);
  const [audioNotes, setAudioNotes] = useState<Set<string>>(new Set());
  const [tag, setTag] = useState<string>("all");

  useEffect(()=>{
    let alive=true;
    (async ()=>{
      const ns = await db.notes.orderBy("updatedAt").reverse().toArray();
      if (!alive) return;
      setNotes(ns);
      const atts = await db.attachments.toArray();
      const has = new Set(atts.filter(a=>String(a.type||"").startsWith("audio/")).map(a=>a.noteId));
      setAudioNotes(has);
    })();
    return ()=>{ alive=false; };
  }, []);

  const filtered = useMemo(()=>{
    if (tag==="all") return notes;
    if (tag==="#daily") return notes.filter(n=>n.tags.includes("#daily"));
    if (tag==="audio") return notes.filter(n=>audioNotes.has(n.id));
    return notes;
  }, [notes, tag, audioNotes]);

  return (
    <div className="p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="font-semibold">Notes</h2>
        <button className="btn" onClick={onNewNote}>새 노트</button>
      </header>

      <div className="flex gap-2 text-sm">
        {["all","#daily","audio"].map(t=>(
          <button key={t} onClick={()=>setTag(t)} className={"px-3 py-1 rounded-full border " + (tag===t?"bg-slate-700 border-slate-600":"border-slate-700 hover:bg-slate-800")}>
            {t==="all"?"전체":t}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {filtered.map(n=>(
          <article key={n.id} className="rounded-xl border border-slate-700 p-3 hover:bg-slate-800 cursor-pointer" onClick={()=>onNoteSelect(n.id)}>
            <div className="text-xs text-slate-400">{new Date(n.updatedAt).toLocaleString()}</div>
            <div className="line-clamp-2" dangerouslySetInnerHTML={{__html: n.content}}/>
            <div className="mt-1 flex flex-wrap gap-1">{n.tags.map(t=>(<span key={t} className="text-xs bg-slate-700 rounded-full px-2 py-0.5">{t}</span>))}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
