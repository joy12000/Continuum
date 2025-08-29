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
  const { data: noteData, error: noteError } = await supabase
    .from("notes")
    .insert({ title: note.title, body: note.body, user_id: note.user_id })
    .select()
    .single();
  if (noteError) throw noteError;
  if (!noteData) throw new Error("Failed to insert note");

  const chunks = chunkBySentence(note.body, 512, 50);
  const embeddings = await generateEmbeddings(chunks);

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

export async function recalculateChunksAndEmbeddings(noteId: string, newBody: string) {
  // 1. Delete old chunks
  const { error: deleteError } = await supabase.from("note_chunks").delete().eq("note_id", noteId);
  if (deleteError) throw deleteError;

  // 2. Create new chunks and embeddings
  const chunks = chunkBySentence(newBody, 512, 50);
  if (chunks.length === 0) return; // Nothing to do

  const embeddings = await generateEmbeddings(chunks);

  // 3. Insert new chunks
  const rows = chunks.map((content, i) => ({
    note_id: noteId,
    chunk_index: i,
    content,
    embedding: embeddings[i],
    lang: "ko",
  }));

  const { error: chunkError } = await supabase.from("note_chunks").insert(rows);
  if (chunkError) throw chunkError;
}

export async function listNotes(userId: string) {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body, created_at, updated_at, tags, citations")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getNoteById(noteId: string, userId: string) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getNotesByIds(noteIds: string[]) {
  const { data, error } = await supabase.rpc("get_notes_by_ids", {
    note_ids: noteIds,
  });
  if (error) throw error;
  return data;
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