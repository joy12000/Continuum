// 간단한 연결 계산 유틸: citations/tag + (옵션) 임베딩 코사인
type Note = { id: string; title?: string; body?: string; tags?: string[]; citations?: { noteId: string }[] };
type VecMap = Map<string, number[]>;

function dot(a: number[], b: number[]) { let s = 0; for (let i=0;i<Math.min(a.length,b.length);i++) s += a[i]*b[i]; return s; }
function norm(a: number[]) { return Math.sqrt(dot(a,a)); }
function cosine(a?: number[], b?: number[]) {
  if (!a?.length || !b?.length) return 0;
  const d = dot(a,b), n = norm(a)*norm(b);
  return n ? d/n : 0;
}

export function computeConnections(
  note: Note,
  notes: Note[],
  vecById: VecMap,
  weights = { citation: 1.0, sim: 0.6, tag: 0.2 },
  k = 4
) {
  const result: { toId: string; score: number; reasons: string[] }[] = [];
  const tags = new Set((note.tags || []).map(t => String(t).toLowerCase()));
  const cites = new Set((note.citations || []).map(c => c.noteId));
  const v0 = vecById.get(note.id);

  for (const other of notes) {
    if (!other || other.id === note.id) continue;
    let score = 0;
    const reasons: string[] = [];

    // citation (양방향/단방향)
    const ocites = new Set((other.citations || []).map(c => c.noteId));
    const cited = cites.has(other.id) || ocites.has(note.id);
    if (cited) { score += weights.citation; reasons.push('cit'); }

    // tag overlap
    if (tags.size && other.tags?.length) {
      const hit = other.tags.some(t => tags.has(String(t).toLowerCase()));
      if (hit) { score += weights.tag; reasons.push('tag'); }
    }

    // cosine sim (optional)
    const v1 = vecById.get(other.id);
    if (v0 && v1) {
      const s = cosine(v0, v1);
      if (s > 0) { score += s * weights.sim; reasons.push(`sim:${s.toFixed(2)}`); }
    }

    if (score > 0) result.push({ toId: other.id, score, reasons });
  }

  return result.sort((a,b) => b.score - a.score).slice(0, k);
}
