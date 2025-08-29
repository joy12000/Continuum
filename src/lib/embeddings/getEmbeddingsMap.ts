type NoteLite = { id: string };
export async function getEmbeddingsMap(notes: NoteLite[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  if (!notes?.length) return map;
  const res = await fetch("/api/embeddings/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: notes.map(n => n.id) }),
  });
  if (!res.ok) return map;
  const data = await res.json();
  for (const v of data || []) if (v?.id && Array.isArray(v.embedding)) map.set(v.id, v.embedding);
  return map;
}
