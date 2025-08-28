import type { NoteLite } from "../graph/types";

export async function getEmbeddingsMap(notes: NoteLite[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  try {
    // TODO: 실제 임베딩 API/유틸로 교체
    const vecs = await fetch("/api/embeddings/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: notes.map(n => n.id) }),
    }).then(r => r.ok ? r.json() : null);

    if (vecs && Array.isArray(vecs)) {
      for (const v of vecs) {
        if (v?.id && Array.isArray(v?.embedding)) map.set(v.id, v.embedding);
      }
    }
  } catch { /* no-op: 빈 맵 폴백 */ }
  return map;
}
