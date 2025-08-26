import { supabase } from "./supabase";
import { toSentences } from "./rag/chunker";

async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const resp = await fetch("/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: chunks }),
  });
  if (!resp.ok) {
    let err: any = {};
    try { err = await resp.json(); } catch {}
    throw new Error(`Failed to generate embeddings: ${err?.error || resp.statusText}`);
  }
  const data = await resp.json();
  return data.embeddings as number[][];
}

// Simple sentence-based chunker with overlap
function chunkBySentence(htmlOrText: string, size = 512, overlap = 50): string[] {
  const sents = toSentences(htmlOrText);
  const out: string[] = [];
  let buf = "";
  for (const s of sents) {
    const next = (buf ? buf + " " : "") + s;
    if (next.length > size && buf) {
      out.push(buf.trim());
      if (overlap > 0) {
        const tail = buf.slice(Math.max(0, buf.length - overlap));
        buf = (tail + " " + s).trim();
      } else {
        buf = s;
      }
    } else {
      buf = next;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export async function addNoteAndChunks(note: { title?: string; body: string; user_id: string }) {
  // 1) insert note
  const { data: noteData, error: noteError } = await supabase
    .from("notes")
    .insert({ title: note.title, body: note.body, user_id: note.user_id })
    .select()
    .single();
  if (noteError) throw noteError;
  if (!noteData) throw new Error("Failed to insert note");

  // 2) chunk
  const chunks = chunkBySentence(note.body, 512, 50);

  // 3) embed
  const embeddings = await generateEmbeddings(chunks);

  // 4) insert chunks
  const rows = chunks.map((content, i) => ({
    note_id: noteData.id,
    chunk_index: i,
    content,
    embedding: embeddings[i],
    lang: "ko",
  }));

  const { error: chunkError } = await supabase.from("note_chunks").insert(rows);
  if (chunkError) throw chunkError;

  return noteData;
}

export async function searchChunks(query: string, userId: string) {
  const [q] = await generateEmbeddings([query]);
  const { data, error } = await supabase.rpc("search_chunks", {
    q_emb: q,
    uid: userId,
    limit_k: 10,
  });
  if (error) throw error;
  return data as Array<{ note_id: string; chunk_index: number; content: string; distance: number }>;
}
