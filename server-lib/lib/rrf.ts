
// Reciprocal Rank Fusion (RRF) implementation

export type RankedList = { id: string; score: number }[];

export function rrf(rankings: RankedList[], k = 60): RankedList {
  const fused: { [key: string]: number } = {};

  for (const list of rankings) {
    for (let i = 0; i < list.length; i++) {
      const doc = list[i];
      const rank = i + 1;
      fused[doc.id] = (fused[doc.id] || 0) + 1 / (k + rank);
    }
  }

  const sorted = Object.entries(fused).sort((a, b) => b[1] - a[1]);
  return sorted.map(([id, score]) => ({ id, score }));
}
