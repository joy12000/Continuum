import type { NoteLite } from "../graph/types";

export async function getEmbeddingsMap(notes: NoteLite[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  const notesWithContent = notes.filter(n => n.content && n.content.trim().length > 0);

  if (notesWithContent.length === 0) {
    return map;
  }

  try {
    const resp = await fetch("/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: notesWithContent.map(n => n.content || '') }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const embeddings = data.embeddings as number[][];
      if (embeddings && embeddings.length === notesWithContent.length) {
        for (let i = 0; i < notesWithContent.length; i++) {
          map.set(notesWithContent[i].id, embeddings[i]);
        }
      }
    }
  } catch (e) {
    console.error("Failed to get embeddings map:", e);
    /* no-op: 빈 맵 폴백 */
  }
  return map;
}