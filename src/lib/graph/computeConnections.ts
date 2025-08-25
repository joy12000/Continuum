// Lightweight connection ranking used by the LinksTimeline.
// Combines: (1) citation/link presence (2) cosine similarity (3) tag overlap.
// Weights follow: citation 1.0 > cosine 0.6 > tags 0.2 (tweakable).

export type Id = number | string;

export interface Note {
  id: Id;
  content: string;
  title?: string;
  tags?: string[];
  // Optionally, some shapes we try to detect for explicit citations:
  sourceNoteId?: Id; // single source
  sourceNoteIds?: Id[]; // multiple sources
  citations?: Array<{ noteId?: Id }>; // array of objects
}

export interface Embedding { noteId: Id; vector: number[] }

export interface RankedEdge {
  toId: Id;
  score: number;
  reasons: string[];
}

export interface RankOptions {
  k?: number;
  weights?: { cite: number; sim: number; tag: number };
}

const defaultWeights = { cite: 1.0, sim: 0.6, tag: 0.2 };

function cosine(a: number[], b: number[]) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i=0;i<a.length;i++) {
    dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function jaccard(a?: string[], b?: string[]) {
  const A = new Set((a||[]).map(s => s.toLowerCase()));
  const B = new Set((b||[]).map(s => s.toLowerCase()));
  if (!A.size && !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

function hasCitation(from: Note, to: Note): boolean {
  if ((from.sourceNoteId as any) === to.id) return true;
  if (Array.isArray(from.sourceNoteIds) && from.sourceNoteIds.includes(to.id)) return true;
  if (Array.isArray((from as any).links) && (from as any).links.includes(to.id)) return true;
  if (Array.isArray(from.citations)) {
    return from.citations.some(c => c?.noteId === to.id);
  }
  return false;
}

export function rankConnections(seed: Note, allNotes: Note[], embeddings: Embedding[], opts: RankOptions = {}): RankedEdge[] {
  const { k = 3, weights = defaultWeights } = opts;
  const vecById = new Map<Id, number[]>();
  for (const e of embeddings || []) vecById.set(e.noteId, e.vector);

  const out: RankedEdge[] = [];
  for (const n of allNotes) {
    if (n.id === seed.id) continue;
    const reasons: string[] = [];
    let score = 0;

    if (hasCitation(seed, n)) { score += weights.cite; reasons.push("cite"); }

    const v1 = vecById.get(seed.id) || [];
    const v2 = vecById.get(n.id) || [];
    const sim = cosine(v1, v2);
    if (sim > 0) { score += weights.sim * sim; reasons.push(`sim:${sim.toFixed(2)}`); }

    const tj = jaccard(seed.tags, n.tags);
    if (tj > 0) { score += weights.tag * tj; reasons.push(`tag:${tj.toFixed(2)}`); }

    if (score > 0) out.push({ toId: n.id, score, reasons });
  }

  out.sort((a,b) => b.score - a.score);
  return out.slice(0, k);
}