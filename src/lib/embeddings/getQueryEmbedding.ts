export async function getQueryEmbedding(text: string, opts?: { signal?: AbortSignal }): Promise<number[]> {
  const res = await fetch('/api/embeddings/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error('embedding failed');
  const json = await res.json();
  return json.embedding as number[];
}
