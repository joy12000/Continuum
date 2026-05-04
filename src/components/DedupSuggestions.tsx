'use client';
import { useMemo, useState } from "react";
import type { Note } from "../lib/db";
import toast from 'react-hot-toast';

class RAGClient {
  private w: Worker;
  private p = new Map<string, {resolve:(v:any)=>void; reject:(e:any)=>void}>();
  constructor(){ this.w = new Worker(new URL("../workers/ragWorker.ts", import.meta.url), { type:"module" }); this.w.onmessage = (e: MessageEvent)=>{ const { id, ok, result, error } = e.data || {}; const h=this.p.get(id); if(!h) return; this.p.delete(id); ok? h.resolve(result) : h.reject(new Error(error||"RAG worker error")); }; }
  call(type:string, payload:any){ const id = crypto.randomUUID(); return new Promise((resolve,reject)=>{ this.p.set(id,{resolve,reject}); this.w.postMessage({ id, type, payload }); }); }
  dedup(payload:any){ return this.call("dedup", payload); }
}

export function DedupSuggestions({ notes, engine, onMerge }: { notes: Note[]; engine: "auto" | "remote"; onMerge: (keep: string, remove: string[]) => Promise<void>; }) {
  const [busy, setBusy] = useState(false);
  const [groups, setGroups] = useState<{ ids: string[]; score: number; size: number }[]>([]);
  const client = useMemo(() => new RAGClient(), []);

  async function scan() {
    setBusy(true);
    try {
      const res: any = await client.dedup({ notes, engine, threshold: 0.92, max: 500 });
      setGroups(res);
    } catch (e) {
      console.error(e);
      toast.error("스캔 중 오류가 발생했습니다.");
    }
    setBusy(false);
  }

  async function merge(g: { ids: string[] }) {
    const [keep, ...remove] = g.ids;
    await onMerge(keep, remove);
    toast.success(`병합 완료: ${remove.length}개 제거됨`);
    setGroups(prev => prev.filter(x => x !== g));
  }

  return (
    <div className="card">
      <div className="small">중복 메모 정리 (유사도 0.92 이상, 최대 500개 스캔)</div>
      <div className="row">
        <button className="btn" onClick={scan} disabled={busy}>
          {busy ? "스캔 중..." : "스캔 시작"}
        </button>
      </div>
      {groups.length > 0 && (
        <div className="small" style={{ marginTop: 8 }}>
          {groups.length}개의 중복 그룹이 발견되었습니다.
        </div>
      )}
      <ul className="list-disc pl-5">
        {groups.map((g, i) => (
          <li key={i}>
            {g.ids.slice(0, 3).join(", ")}
            {g.ids.length > 3 ? ` 외 ${g.ids.length - 3}개` : ""}
            <button className="btn" style={{ marginLeft: 8 }} onClick={() => merge(g)}>
              하나로 병합
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
