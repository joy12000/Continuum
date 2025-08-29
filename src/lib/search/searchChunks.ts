export async function searchChunks({
  qEmb,
  limit = 12,
  signal,
}: {
  qEmb: number[];
  limit?: number;
  signal?: AbortSignal;
}) {
  const res = await fetch('/api/search-chunks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q_emb: qEmb, limit }),
    signal,
  });
  if (!res.ok) throw new Error('search failed');
  return await res.json();
}
