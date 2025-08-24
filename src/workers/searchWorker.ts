/// <reference lib="webworker" />
import { tokenize } from "../lib/rag/chunker";
import { cosine } from "../lib/rag/mmr";
import { buildBM25, bm25Score } from "../lib/rag/bm25";
import { db } from "../lib/db";
import { cosineSim } from "../lib/search/cosine";

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

/**
 * Finds duplicate notes based on cosine similarity of their embeddings.
 * @param {number} threshold - The similarity threshold to consider notes as duplicates.
 */
async function findDuplicates(threshold: number) {
  const allEmbeddings = await db.embeddings.toArray();
  const notes = await db.notes.toArray();
  const noteMap = new Map(notes.map(n => [n.id, n]));
  
  const duplicates: string[][] = [];
  const processedNoteIds = new Set<string>();
  
  const totalComparisons = allEmbeddings.length * (allEmbeddings.length - 1) / 2;
  let comparisonsDone = 0;
  let lastProgress = 0;

  for (let i = 0; i < allEmbeddings.length; i++) {
    if (processedNoteIds.has(allEmbeddings[i].noteId)) {
      continue;
    }

    const group = [allEmbeddings[i].noteId];
    processedNoteIds.add(allEmbeddings[i].noteId);

    for (let j = i + 1; j < allEmbeddings.length; j++) {
      if (processedNoteIds.has(allEmbeddings[j].noteId)) {
        continue;
      }

      const sim = cosineSim(allEmbeddings[i].vec, allEmbeddings[j].vec);
      if (sim >= threshold) {
        group.push(allEmbeddings[j].noteId);
        processedNoteIds.add(allEmbeddings[j].noteId);
      }
      
      comparisonsDone++;
      const progress = Math.floor((comparisonsDone / totalComparisons) * 10);
      if (progress > lastProgress) {
        lastProgress = progress;
        self.postMessage({ type: 'FIND_DUPLICATES_PROGRESS', progress: progress / 10 });
      }
    }

    if (group.length > 1) {
      duplicates.push(group);
    }
  }
  
  // Enrich with note content for display
  const result = duplicates.map(group => 
    group.map(noteId => {
      const note = noteMap.get(noteId);
      return { id: noteId, content: note?.content.substring(0, 100) || '' };
    })
  );

  self.postMessage({ type: 'FIND_DUPLICATES_RESULT', duplicates: result });
}


/**
 * Finds notes similar to the given text, excluding the current note.
 * @param {string} text The text to find similarities for.
 * @param {number} topK The number of similar notes to return.
 */
async function findSimilar(text: string, topK: number, engine: "auto" | "remote") {
  try {
    const [textVec] = await embed(engine, [text]);
    if (!textVec) return;

    const allEmbeddings = await db.embeddings.toArray();

    const similarities = allEmbeddings.map(emb => ({
      noteId: emb.noteId,
      score: cosineSim(textVec, emb.vec),
    }));

    similarities.sort((a, b) => b.score - a.score);
    const topKResults = similarities.slice(0, topK);

    if (topKResults.length > 0) {
      const topNoteIds = topKResults.map(s => s.noteId);
      const notes = await db.notes.bulkGet(topNoteIds);
      self.postMessage({ type: 'SIMILAR_RESULT', payload: notes.filter(Boolean) });
    } else {
      self.postMessage({ type: 'SIMILAR_RESULT', payload: [] });
    }
  } catch (error) {
    console.error("Error finding similar notes:", error);
    // Optionally, send an error message back to the main thread
    self.postMessage({ type: 'SIMILAR_ERROR', error: (error as Error).message });
  }
}


self.addEventListener("message", async (e: MessageEvent)=>{
  const { id, type, payload } = e.data || {};
  try{
    if (type === "score"){
      const { q, engine, notes } = payload as Req;
      const terms = tokenize(q);
      const vecs = await embed(engine, [q, ...notes.map(n=>n.content)]);
      const qvec = vecs[0];
      const nvecs = vecs.slice(1);
      const bm25 = buildBM25(notes.map(n => ({ id: n.id, tokens: tokenize(n.content) })));
      const scores = notes.map((n,i)=>{
        const docTokens = bm25.docs[i]?.tokens || [];
        const s1 = bm25Score(q, docTokens, bm25);
        const s2 = cosine(qvec, nvecs[i]);
        return { id:n.id, score: s1 * 0.2 + s2 * 0.8 };
      });
      scores.sort((a,b)=>b.score-a.score);
      self.postMessage({ id, ok:true, result:scores });
      return;
    } else if (type === 'FIND_DUPLICATES') {
      await findDuplicates(payload.threshold);
      return;
    } else if (type === 'SIMILAR') {
      await findSimilar(payload.text, payload.topK, payload.engine || 'auto');
      return;
    }
    self.postMessage({ id, ok:false, error:"unknown" });
  }catch(err:any){
    self.postMessage({ id, ok:false, error: String(err?.message || err) });
  }
});


// --- date>= filter support (lightweight) ---
function parseDateFilter(q:string){
  const m = q.match(/date\s*>=\s*(\d{4}-\d{2}-\d{2})/i);
  if(!m) return null;
  const ts = new Date(m[1] + "T00:00:00Z").getTime();
  return isNaN(ts) ? null : ts;
}
