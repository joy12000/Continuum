// src/lib/embeddings/getQueryEmbedding.ts
// /api/embeddings (POST) 우선, 실패 시 GET 폴백
export async function getQueryEmbedding(text: string, opts?: { signal?: AbortSignal }): Promise<number[]> {
  // 1) POST 우선
  try {
    const res = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: opts?.signal,
    });
    if (res.ok) {
      const json = await res.json();
      return json.embedding as number[];
    }
    // 405 등은 GET로 폴백
  } catch (_) {}

  // 2) GET 폴백
  const res2 = await fetch('/api/embeddings?text=' + encodeURIComponent(text), {
    method: 'GET',
    signal: opts?.signal,
  });
  if (!res2.ok) throw new Error('Failed to generate embeddings');
  const json2 = await res2.json();
  return json2.embedding as number[];
}
