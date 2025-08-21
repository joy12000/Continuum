import { useMemo, useRef, useState } from "react";
import { AnswerCard } from "./AnswerCard";
import { GeneratedAnswer } from "./GeneratedAnswer";
import { AnswerData } from '../types/common';
import { loadSettings } from "../lib/config";
import { generateWithFallback } from "../lib/gen/generate";

class RAGClient {
  private w: Worker;
  private p = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
  constructor() {
    this.w = new Worker(new URL("../workers/ragWorker.ts", import.meta.url), { type: "module" });
    this.w.onmessage = (e: MessageEvent) => {
      const { id, ok, result, error } = e.data || {};
      const h = this.p.get(id);
      if (!h) return;
      this.p.delete(id);
      ok ? h.resolve(result) : h.reject(new Error(error || "RAG worker error"));
    };
  }
  call(type: string, payload: any) {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.p.set(id, { resolve, reject });
      this.w.postMessage({ id, type, payload });
    });
  }
  ask(payload: any) {
    return this.call("ask", payload);
  }
  reset() {
    return this.call("resetIndex", {});
  }
}



export function AskPanel({ engine, setQuery, notes }: { engine: "auto" | "remote"; setQuery: (q: string) => void; notes?: any[] }) {
  const rag = useMemo(() => new RAGClient(), []);
  const qRef = useRef<HTMLInputElement>(null);
  const [alpha, setAlpha] = useState(0.6);
  const [lambda, setLambda] = useState(0.4);
  
  // State for extractive RAG results
  const [res, setRes] = useState<{ kp: string[]; cites: any[] } | null>(null);
  
  // State for generative results
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<Error | null>(null);
  const [resGen, setResGen] = useState<AnswerData | null>(null);
  
  const settings = loadSettings();

  async function onAsk() {
    const q = qRef.current?.value?.trim();
    if (!q) return;

    setIsGenerating(true);
    setGenError(null);
    setResGen(null);
    setRes(null);

    try {
      const out: any = await rag.ask({
        q,
        engine,
        lambdaMMR: lambda,
        alphaSem: alpha,
        topK: 8,
        topN: 50,
        notes: Array.isArray(notes) ? notes : undefined,
      });
      
      setRes({ kp: out.keypoints, cites: out.citations });

      if ((settings as any).genEnabled) {
        const genResult = await generateWithFallback(q, (settings as any).genEndpoint || "/api");
        setResGen(genResult);
      }
    } catch (e: any) {
      console.error(e);
      setGenError(e);
      setRes({ kp: [], cites: [] }); // Also clear extractive results on error
    } finally {
      setIsGenerating(false);
    }
  }

  const showGenAnswer = (settings as any).genEnabled;

  return (
    <div className="card bg-base-100 shadow-xl mt-4">
      <div className="card-body">
        <div className="flex space-x-2">
          <input
            ref={qRef}
            className="input input-bordered w-full"
            placeholder="Ask a question..."
            onKeyDown={(e) => {
              if (e.key === "Enter") onAsk();
            }}
          />
          <button className="btn btn-primary" onClick={onAsk} disabled={isGenerating}>
            {isGenerating ? <span className="loading loading-spinner"></span> : "Ask"}
          </button>
        </div>
        <div className="flex items-center space-x-4 text-sm mt-2">
          <label className="label cursor-pointer flex-1">
            <span className="label-text">Semantic Weight: {alpha.toFixed(2)}</span>
            <input type="range" min={0} max={1} step={0.05} value={alpha} onChange={(e) => setAlpha(parseFloat(e.target.value))} className="range range-xs" />
          </label>
          <label className="label cursor-pointer flex-1">
            <span className="label-text">MMR λ: {lambda.toFixed(2)}</span>
            <input type="range" min={0} max={1} step={0.05} value={lambda} onChange={(e) => setLambda(parseFloat(e.target.value))} className="range range-xs" />
          </label>
        </div>
        
        {showGenAnswer && resGen ? (
          <GeneratedAnswer
            data={resGen}
          />
        ) : showGenAnswer && isGenerating ? (
          <div className="text-center text-slate-500 animate-pulse">AI가 답변을 생성 중입니다...</div>
        ) : showGenAnswer && genError ? (
          <div className="text-center text-red-500">{genError.message}</div>
        ) : (
          res && <AnswerCard kp={res.kp} cites={res.cites} onJump={(id) => setQuery("#" + id)} />
        )}
      </div>
    </div>
  );
}
