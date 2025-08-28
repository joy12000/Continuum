import type { NoteLite } from "./types";

type Connection = {
  toId: string;
  score: number;
  reasons: string[];
};

type Weights = {
  citation: number;
  sim: number;
  tag: number;
};

function cosine(a: number[], b: number[]) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i=0;i<a.length;i++) {
    dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * 노트 간의 연결 스코어를 계산합니다.
 *
 * @param note - 기준 노트
 * @param allNotes - 모든 노트 목록
 * @param vecById - ID별 임베딩 벡터 맵
 * @param weights - 연결 종류별 가중치
 * @param k - 반환할 상위 연결 개수
 * @returns 스코어가 높은 순으로 정렬된 연결 목록
 */
export function computeConnections(
  note: NoteLite,
  allNotes: NoteLite[],
  vecById: Map<string, number[]>,
  weights: Weights = { citation: 1.0, sim: 0.6, tag: 0.2 },
  k = 3,
): Connection[] {
  const scores = new Map<string, { score: number; reasons: Set<string> }>();

  // 2. 코사인 유사도 (Cosine Similarity)
  const simWeight = weights.sim;
  const noteVec = vecById.get(String(note.id));

  if (noteVec) {
    for (const other of allNotes) {
      if (String(other.id) === String(note.id)) continue;
      const otherVec = vecById.get(String(other.id));
      if (otherVec) {
        const sim = cosine(noteVec, otherVec);
        if (sim > 0.7) { // Threshold from original spec
          const current = scores.get(String(other.id)) || { score: 0, reasons: new Set() };
          current.score += sim * simWeight;
          current.reasons.add(`sim:${sim.toFixed(2)}`);
          scores.set(String(other.id), current);
        }
      }
    }
  }

  // Final score calculation and sorting
  const sortedConnections = Array.from(scores.entries())
    .map(([toId, { score, reasons }]) => ({
      toId,
      score,
      reasons: Array.from(reasons),
    }))
    .sort((a, b) => b.score - a.score);

  return sortedConnections.slice(0, k);
}