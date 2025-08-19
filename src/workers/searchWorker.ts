/// <reference lib="webworker" />
import { tokenize } from "../lib/rag/chunker";
import { cosine } from "../lib/rag/mmr";
import { buildBM25, bm25Score } from "../lib/rag/bm25";
declare const self: DedicatedWorkerGlobalScope;

type Note = { id: string; content: string };
type Req = { q: string; engine: "auto"|"remote"; notes: Note[] };
let cache: Map<string, { hash: number; vec: number[] }> = new Map();

function hash(s: string){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*16777619)>>>0; } return h>>>0; }

async function embed(engine:"auto"|"remote", texts:string[]): Promise<number[][]> {
  const { getSemanticAdapter } = await import("../lib/semantic");
  const a = await getSemanticAdapter(engine); await a.ensureReady();
  return await a.embed(texts);
}

self.addEventListener("message", async (e: MessageEvent)=>{
  const { id, type, payload } = e.data || {};
  try{
    if (type === "score"){
      const { q, engine, notes } = payload as Req;
      const [qv] = await embed(engine, [q]);
      const idx = buildBM25(notes.map(n=>({ id: n.id, tokens: tokenize(n.content) })));
      const toEmbed: string[] = []; const ids: string[] = [];
      for (const n of notes){
        const h = hash(n.content||""); const c = cache.get(n.id);
        if (!c || c.hash !== h){ toEmbed.push(n.content||""); ids.push(n.id); }
      }
      if (toEmbed.length){
        const vecs = await embed(engine, toEmbed);
        for (let i=0;i<vecs.length;i++){ cache.set(ids[i], { hash: hash(toEmbed[i]), vec: vecs[i] }); }
      }
      const scored = notes.map(n=>{
        const vec = cache.get(n.id)?.vec || [];
        const sSem = cosine(vec, qv);
        const sBm25 = bm25Score(q, tokenize(n.content), idx);
        return { id: n.id, sSem, sBm25 };
      });
      const rankSem = scored.slice().sort((a,b)=>b.sSem-a.sSem).map(x=>x.id);
      const rankBM = scored.slice().sort((a,b)=>b.sBm25-a.sBm25).map(x=>x.id);
      const score = new Map<string, number>();
      const add = (arr: string[]) => arr.forEach((id,i)=> score.set(id, (score.get(id)||0) + 1/(60+i+1)));
      add(rankSem); add(rankBM);
      const final = Array.from(score.entries()).sort((a,b)=>b[1]-a[1]).map(([id])=>id);
      self.postMessage({ id, ok:true, result: final });
      return;
    }
    self.postMessage({ id, ok:false, error:"unknown" });
  }catch(err:any){
    self.postMessage({ id, ok:false, error: String(err?.message || err) });
  }
});
