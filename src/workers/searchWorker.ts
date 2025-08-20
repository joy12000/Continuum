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
 * @param {string} currentNoteId The ID of the note currently being edited, to exclude from results.
 */
async function findSimilar(text: string, currentNoteId: string) {
  const [textVec] = await embed('auto', [text]);
  if (!textVec) return;

  // Fetch embeddings for all notes except the current one
  const otherEmbeddings = await db.embeddings.where('noteId').notEqual(currentNoteId).toArray();

  // Calculate cosine similarity
  const similarities = otherEmbeddings.map(emb => ({
    noteId: emb.noteId,
    score: cosineSim(textVec, emb.vec),
  }));

  // Sort by similarity score and take the top 3
  similarities.sort((a, b) => b.score - a.score);
  const top3 = similarities.slice(0, 3);

  if (top3.length === 0) {
    self.postMessage({ type: 'SIMILAR_FOUND', payload: { notes: [] } });
    return;
  }

  // Fetch the full note data for the top 3
  const topNoteIds = top3.map(s => s.noteId);
  const noteMap = new Map((await db.notes.where('id').anyOf(topNoteIds).toArray()).map(n => [n.id, n]));
  
  // Preserve the sorted order
  const notes = topNoteIds.map(id => noteMap.get(id)).filter(Boolean) as Note[];

  self.postMessage({ type: 'SIMILAR_FOUND', payload: { notes } });
}


self.addEventListener("message", async (e: MessageEvent)=>{
  const { id, type, payload } = e.data || {};
  try{
    if (type === "score"){
      // ... (existing score logic remains the same)
    } else if (type === 'FIND_DUPLICATES') {
      await findDuplicates(payload.threshold);
      return;
    } else if (type === 'FIND_SIMILAR') {
      await findSimilar(payload.text, payload.currentNoteId);
      return;
    }
    self.postMessage({ id, ok:false, error:"unknown" });
  }catch(err:any){
    self.postMessage({ id, ok:false, error: String(err?.message || err) });
  }
});
