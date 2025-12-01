import { supabase } from "./supabase";
import { db } from "../store/db";
import { toSentences } from "./rag/chunker";

const USE_NOTE_CHUNKS = import.meta.env?.VITE_USE_NOTE_CHUNKS === "true";

async function indexNoteWithFileSearch(noteId: string, body: string, createdAt: string | number) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const resp = await fetch('/api/v1?action=chat-bundle-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      noteId,
      body,
      createdAt,
    }),
  });

  if (!resp.ok) {
    let errorMessage = 'Failed to sync note with File Search.';
    try {
      const errorJson = await resp.json();
      errorMessage = errorJson?.error || errorMessage;
    } catch {
      errorMessage = await resp.text();
    }
    throw new Error(errorMessage);
  }
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

export type FileSearchResult = {
  noteId: string | null;
  content: string;
  score?: number | null;
  uri?: string;
  fileName?: string;
  chunkId?: string;
};

export async function addNoteAndChunks(note: { title?: string; body: string; user_id: string }) {
  const { data: noteData, error: noteError } = await supabase
    .from("notes")
    .insert({ title: note.title, body: note.body, user_id: note.user_id })
    .select()
    .single();
  if (noteError) throw noteError;
  if (!noteData) throw new Error("Failed to insert note");

  // Add to local DB as well for caching
  await db.notes.put({
    id: noteData.id,
    title: noteData.title,
    body: noteData.body,
    createdAt: new Date(noteData.created_at).getTime(),
    updatedAt: new Date(noteData.updated_at).getTime(),
    tags: [],
  });

  if (USE_NOTE_CHUNKS) {
    const chunks = chunkBySentence(note.body, 512, 50).filter(c => c.trim().length > 0);

    if (chunks.length > 0) {
      const resp = await fetch("/api/v1?action=create-gemini-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: chunks }),
      });
      if (!resp.ok) {
        let err: any = {};
        try { err = await resp.json(); } catch {}
        await db.notes.delete(noteData.id);
        throw new Error(`Failed to generate embeddings: ${err?.error || resp.statusText}`);
      }
      const data = await resp.json();
      const embeddings = data.embeddings as number[][];

      const rows = chunks.map((content, i) => ({
        note_id: noteData.id,
        chunk_index: i,
        content,
        embedding: embeddings[i],
        lang: "ko",
      }));

      const { error: chunkError } = await supabase.from("note_chunks").insert(rows);
      if (chunkError) {
        // Rollback local DB change if chunk insertion fails
        await db.notes.delete(noteData.id);
        throw chunkError;
      }
    }
  }

  await indexNoteWithFileSearch(noteData.id, note.body, noteData.created_at);

  return noteData;
}

export async function recalculateChunksAndEmbeddings(noteId: string, newBody: string) {
  if (USE_NOTE_CHUNKS) {
    // 1. Delete old chunks
    const { error: deleteError } = await supabase.from("note_chunks").delete().eq("note_id", noteId);
    if (deleteError) throw deleteError;

    // 2. Create new chunks and embeddings
    const chunks = chunkBySentence(newBody, 512, 50).filter(c => c.trim().length > 0);
    if (chunks.length > 0) {
      const resp = await fetch("/api/v1?action=create-gemini-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: chunks }),
      });
      if (!resp.ok) {
        let err: any = {};
        try { err = await resp.json(); } catch {}
        throw new Error(`Failed to regenerate embeddings: ${err?.error || resp.statusText}`);
      }
      const data = await resp.json();
      const embeddings = data.embeddings as number[][];

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
  }

  await indexNoteWithFileSearch(noteId, newBody, Date.now());
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
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`/api/v1?action=search&q=${encodeURIComponent(trimmedQuery)}&uid=${userId}&limit=12&timestamp=${Date.now()}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Could not parse error body' }));
    throw new Error(`Search failed with status ${res.status}${errorBody.error ? `: ${errorBody.error}` : ''}`);
  }

  const data = await res.json();
  return (data?.results || []) as FileSearchResult[];
}

export async function deleteAllUserData(userId: string) {
  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select("id")
    .eq("user_id", userId);

  if (notesError) throw notesError;

  const noteIds = notes.map(n => n.id);

  if (noteIds.length > 0) {
    if (USE_NOTE_CHUNKS) {
      const { error: chunkError } = await supabase
        .from("note_chunks")
        .delete()
        .in("note_id", noteIds);
      if (chunkError) console.error("Error deleting chunks:", chunkError); // Log error but continue
    }

    const { error: noteError } = await supabase
      .from("notes")
      .delete()
      .in("id", noteIds);
    if (noteError) throw noteError;
  }
}

export async function updateNote(noteId: string, newContent: { title?: string; body: string }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Authentication required.');

  const resp = await fetch(`/api/v1?action=update-note&noteId=${noteId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(newContent),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to update note');
  }

  const payload = await resp.json();
  if (newContent.body) {
    await recalculateChunksAndEmbeddings(noteId, newContent.body);
  }

  return payload.note;
}

export async function deleteNote(noteId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Authentication required.');

  const resp = await fetch(`/api/v1?action=delete-note&noteId=${noteId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to delete note');
  }
}

export async function bulkAddNotes(notes: { title?: string; body: string }[], user_id: string) {
  // This is a simple iterative implementation. A more robust solution would handle transactions and batching.
  for (const note of notes) {
    try {
      await addNoteAndChunks({ ...note, user_id });
    } catch (error) {
      console.error("Failed to add a note during bulk operation:", error, note);
      // Decide on error handling: continue, stop, or collect failures.
    }
  }
}