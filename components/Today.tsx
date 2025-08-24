import React, { useMemo, useRef, useState } from "react";
import { SearchBar } from "./SearchBar";
import { RichNoteEditor } from "./RichNoteEditor";
import { db, Note } from "../lib/db";
import { Attachment } from "../lib/db";
import { toast } from "../lib/toast";
import { GeneratedAnswer } from "./GeneratedAnswer";
import { AnswerData } from "../types/common";
import { Mic, Save, Calendar, MessageSquare } from "lucide-react";

/** Props are kept source-compatible with the older TodayCanvasScreen */
type View = 'today' | 'settings' | 'diagnostics';
interface Props {
  onNavigate: (v: View)=>void;
  query: string;
  onQueryChange: (s: string)=>void;
  notes: Note[];
  onSearchFocus?: ()=>void;
  suggestedQuestions?: string[];
  isLoadingSuggestions?: boolean;
  suggestionError?: string|null;
  generatedAnswer: { data: AnswerData|null; isLoading: boolean; error: string|null; };
  onNewNote: ()=>void;
  activeNote?: Note;
  onNoteSelect: (id: string)=>void;
  isModelReady: boolean;
  modelStatus: string;
}

/** Small Voice record button that saves audio/webm into attachments for the current note */
function VoiceNoteButton({ noteId }: { noteId?: string }) {
  const [rec, setRec] = useState<MediaRecorder|null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!noteId) { alert("먼저 노트를 생성/선택하세요"); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const m = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunks.current = [];
    m.ondataavailable = (e) => { if (e.data?.size) chunks.current.push(e.data); };
    m.onstop = async () => {
      try {
        setBusy(true);
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const id = crypto.randomUUID();
        const name = `voice-${new Date().toISOString().slice(0,19)}.webm`;
        await db.attachments.add({ id, noteId, name, type: "audio/webm", blob, createdAt: Date.now() } as any);
        toast.success("음성 메모 저장 완료");
      } catch(e:any) {
        toast.error("음성 저장 실패: " + (e?.message || e));
      } finally { setBusy(false); }
    };
    m.start();
    setRec(m);
  }

  function stop() {
    rec?.stop();
    rec?.stream.getTracks().forEach(t=>t.stop());
    setRec(null);
  }

  return (
    <button className="btn flex items-center gap-2" onClick={rec?stop:start} disabled={busy}>
      <Mic size={16} /> {rec ? "녹음 중지" : "음성 메모"}
    </button>
  );
}

/** Five daily questions -> single diary note via /api/generate (type: daily_summary) */

/** Tomorrow promise box: save one-liner to day_index[YYYY-MM-DD] */
function TomorrowBox(){
  const [text, setText] = React.useState<string>(()=> localStorage.getItem("tomorrow_draft") || "");
  const today = new Date();
  const date = today.toISOString().slice(0,10);
  const save = async () => {
    localStorage.setItem("tomorrow_draft","");
    const rec = await (db as any).day_index?.get(date);
    const noteId = rec?.noteId || "";
    await (db as any).day_index?.put({ date, noteId, tomorrow: text });
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tomorrow</h3>
        <button className="btn" onClick={save}>저장</button>
      </div>
      <input value={text} onChange={e=>{ setText(e.target.value); localStorage.setItem("tomorrow_draft", e.target.value);}}
        placeholder="내일 한 줄 약속..." className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700" />
    </div>
  );
}
function DailyCheckin({ onDone }:{ onDone?: (noteId:string)=>void }) {
  const QUESTIONS = [
    { key: "what", label: "오늘 뭐했어?" },
    { key: "wins", label: "잘 된 3가지?" },
    { key: "block", label: "막힌 건?" },
    { key: "learn", label: "배운 1가지?" },
    { key: "tomorrow", label: "내일 한 줄 약속?" }
  ] as const;
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);

  function set(key:string, v:string){ setAnswers(a=>({ ...a, [key]: v })); }

  async function submit() {
    setBusy(true);
    try{
      const payload = {
        type: "daily_summary",
        context: QUESTIONS.map(q=>({ q: q.label, a: String(answers[q.key] || "") })),
        tomorrow: String(answers["tomorrow"] || "")
      };
      const res = await fetch("/api/generate", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      const now = Date.now();
      const dateTag = "#" + new Date(now).toISOString().slice(0,10);
      const title = j?.title || "오늘의 일기";
      const bullets: string[] = Array.isArray(j?.bullets) ? j.bullets : [];
      const summary: string = j?.summary || "";
      const tomorrow: string = j?.tomorrow || (answers["tomorrow"] || "");
      const content = [
        `<h2>${title}</h2>`,
        `<p>${summary}</p>`,
        bullets.length ? `<ul>${bullets.map(b=>`<li>${b}</li>`).join("")}</ul>` : "",
        tomorrow ? `<p><strong>내일:</strong> ${tomorrow}</p>` : ""
      ].join("\n");
      const id = crypto.randomUUID();
      await db.notes.add({ id, content, createdAt: now, updatedAt: now, tags: ["#daily", dateTag] });
      toast.success("일기 생성 완료");
      onDone?.(id);
    }catch(e:any){
      toast.error("일기 생성 실패: " + (e?.message || e));
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3">
      <header className="flex items-center gap-2 font-semibold text-slate-200"><MessageSquare size={16}/> Daily Check‑in</header>
      {QUESTIONS.map(q=>(
        <div key={q.key} className="space-y-1">
          <label className="text-sm text-slate-400">{q.label}</label>
          <textarea className="w-full rounded-lg bg-slate-900/50 border border-slate-700 p-2 text-sm"
            rows={q.key==="wins"?2:2} value={answers[q.key] || ""} onChange={e=>set(q.key, e.target.value)} placeholder="간단히 적어줘"/>
        </div>
      ))}
      <div className="flex justify-end">
        <button className="btn" onClick={submit} disabled={busy}><Save size={16}/> 일기 만들기</button>
      </div>
    </section>
  );
}

export default function Today(props: Props){
  const { onNavigate, query, onQueryChange, notes, onSearchFocus, suggestedQuestions, isLoadingSuggestions, suggestionError, generatedAnswer, onNewNote, activeNote, onNoteSelect, isModelReady, modelStatus } = props;

  return (
    <div className="p-4 space-y-4">
      {/* Top actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">{isModelReady ? "온디바이스 임베딩 준비 ✔︎" : modelStatus}</div>
        <div className="flex gap-2">
          <button className="btn" onClick={onNewNote}>새 노트</button>
          <VoiceNoteButton noteId={activeNote?.id} />
        </div>
      </div>

      {/* Quick Write */}
      <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <h3 className="font-semibold mb-2">Quick Write</h3>
        <RichNoteEditor note={activeNote} onSaved={() => { /* TODO: fix this, onSaved should probably pass the note id */ }} />
      </section>

      {/* Daily Check‑in */}
      <DailyCheckin onDone={onNoteSelect}/>

      {/* Search */}
      <section className="space-y-2">
        <SearchBar q={query} setQ={onQueryChange} onFocus={onSearchFocus || (() => {})} suggestedQuestions={suggestedQuestions || []} isLoadingSuggestions={isLoadingSuggestions || false} suggestionError={suggestionError || null} isModelReady={isModelReady} modelStatus={modelStatus} />
        {suggestedQuestions && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((s,i)=>(
              <button key={i} className="px-2 py-1 rounded-full bg-slate-700 text-xs hover:bg-slate-600" onClick={()=>onQueryChange(s)}>{s}</button>
            ))}
          </div>
        )}
      </section>

      {/* AI Answer */}
      <section>
        {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} />}
      </section>

      {/* Results (today can still list) */}
      <section className="grid gap-2">
        {notes.map(n=>(
          <article key={n.id} className="rounded-xl border border-slate-700 p-3 hover:bg-slate-800 cursor-pointer" onClick={()=>onNoteSelect(n.id)}>
            <div className="text-xs text-slate-400">{new Date(n.updatedAt).toLocaleString()}</div>
            <div className="line-clamp-2" dangerouslySetInnerHTML={{__html: n.content}}/>
            <div className="mt-1 flex flex-wrap gap-1">{n.tags.map(t=>(<span key={t} className="text-xs bg-slate-700 rounded-full px-2 py-0.5">{t}</span>))}</div>
          </article>
        ))}
      </section>
    </div>
  );
}
