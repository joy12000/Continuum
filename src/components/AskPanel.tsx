import { useMemo, useRef, useState } from "react";
import { AnswerCard } from "./AnswerCard";
import { GeneratedAnswer } from "./GeneratedAnswer";
import { loadSettings } from "../lib/config";
import { generateWithFallback } from "../lib/gen/generate";

class RAGClient {
  private w: Worker;
  private p = new Map<string, {resolve:(v:any)=>void; reject:(e:any)=>void}>();
  constructor(){ this.w = new Worker(new URL("../workers/ragWorker.ts", import.meta.url), { type:"module" }); this.w.onmessage = (e: MessageEvent)=>{ const { id, ok, result, error } = e.data || {}; const h=this.p.get(id); if(!h) return; this.p.delete(id); ok? h.resolve(result) : h.reject(new Error(error||"RAG worker error")); }; }
  call(type:string, payload:any){ const id = crypto.randomUUID(); return new Promise((resolve,reject)=>{ this.p.set(id,{resolve,reject}); this.w.postMessage({ id, type, payload }); }); }
  ask(payload:any){ return this.call("ask", payload); }
  reset(){ return this.call("resetIndex", {}); }
}

export function AskPanel({ engine, setQuery, notes }:{ engine:"auto"|"remote"; setQuery:(q:string)=>void; notes?:any[]; }){
  const rag = useMemo(()=> new RAGClient(), []);
  const qRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [alpha, setAlpha] = useState(0.6);
  const [lambda, setLambda] = useState(0.4);
  const [res, setRes] = useState<{kp:string[]; cites:any[]} | null>(null);
  const [resGen, setResGen] = useState<{ summary:string; bullets:string[]; cites:any[] } | null>(null);
  const settings = loadSettings();

  async function onAsk(){
    const q = qRef.current?.value?.trim(); if(!q) return;
    setBusy(true); setResGen(null);
    try{
      const out:any = await rag.ask({ q, engine, lambdaMMR: lambda, alphaSem: alpha, topK: 8, topN: 50, notes: Array.isArray(notes)? notes: undefined });
      setRes({ kp: out.keypoints, cites: out.citations });
      if ((settings as any).genEnabled){
        const g = await generateWithFallback(q, (settings as any).genEndpoint || "/api");
        setResGen({ summary: g.summary, bullets: g.bullets, cites: out.citations });
      }
    } catch(e){ console.error(e); setRes({ kp: [], cites: [] }); }
    setBusy(false);
  }

  return (
    <div className="card" style={{marginTop:12}}>
      <div className="row">
        <input ref={qRef} className="input" placeholder="질문을 입력하세요 (생성형 기본, 오프라인시 추출형)" onKeyDown={e=>{ if(e.key==='Enter') onAsk(); }} />
        <button className="btn" onClick={onAsk} disabled={busy}>{busy? "생각 중…" : "Ask"}</button>
      </div>
      <div className="row small">
        <div>시맨틱가중 {alpha.toFixed(2)}</div><input type="range" min={0} max={1} step={0.05} value={alpha} onChange={e=>setAlpha(parseFloat(e.target.value))} />
        <div>MMR λ {lambda.toFixed(2)}</div><input type="range" min={0} max={1} step={0.05} value={lambda} onChange={e=>setLambda(parseFloat(e.target.value))} />
      </div>
      {resGen ? <GeneratedAnswer summary={resGen.summary} bullets={resGen.bullets} cites={resGen.cites} onJump={(id)=>setQuery('#'+id)} /> : (res && <AnswerCard kp={res.kp} cites={res.cites} onJump={(id)=>setQuery('#'+id)} />)}
    </div>
  );
}
