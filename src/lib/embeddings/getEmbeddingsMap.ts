import { supabase } from '../supabase';

type NoteLite = { id: string };
export async function getEmbeddingsMap(notes: NoteLite[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  if (!notes?.length) return map;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error("No active session, cannot fetch embeddings.");
    return map;
  }
  const token = session.access_token;

  const res = await fetch("/api/on-device-support/get-embeddings-batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ ids: notes.map(n => n.id) }),
  });
  if (!res.ok) return map;
  const data = await res.json();
  for (const v of data || []) if (v?.id && Array.isArray(v.embedding)) map.set(v.id, v.embedding);
  return map;
}