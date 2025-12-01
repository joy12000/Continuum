import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../auth.js';
import { generateTitleAndTags } from '../ai.js';
import { MAX_NOTES } from '../config.js';
import { withFileSearchContext } from '../fileSearchContext.js';
import { deleteNoteFilesFromStore, upsertNoteFileSearchDocument } from '../fileSearch.js';

export async function handleGetNote(req: VercelRequest, res: VercelResponse) {
  const auth = await withFileSearchContext(req, res);
  if (!auth) return;
  const { supabase, userId, storeName } = auth;
  const noteId = req.query.noteId as string;

  if (!noteId) {
    return res.status(400).json({ error: "Missing noteId" });
  }

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body, tags, created_at, updated_at")
    .eq("id", noteId)
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to fetch note", detail: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: "Note not found" });
  }

  const note = {
    ...data,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
  delete (note as any).created_at;
  delete (note as any).updated_at;

  res.status(200).json(note);
}

export async function handleGetNoteAttachments(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
  const noteId = req.query.noteId as string;

  if (!noteId) {
    return res.status(400).json({ error: "Missing noteId" });
  }

  try {
    const { data: attachments, error: attachmentsError } = await supabase
      .from('note_attachments')
      .select('*')
      .eq('note_id', noteId);

    if (attachmentsError) throw new Error(attachmentsError.message);

    return res.status(200).json({ attachments: attachments || [] });
  } catch (e: any) {
    console.error(`handleGetNoteAttachments failed for note ${noteId}:`, e);
    return res.status(500).json({ error: e.message || "Failed to fetch attachments." });
  }
}

export async function handleUpdateNote(req: VercelRequest, res: VercelResponse) {
  const auth = await withFileSearchContext(req, res);
  if (!auth) return;
  const { supabase, userId, storeName } = auth;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const noteId = req.query.noteId as string;
  if (!noteId) {
    return res.status(400).json({ error: 'Missing noteId' });
  }

  let { title, body, tags } = req.body;

  if (title === undefined && body === undefined && tags === undefined) {
    return res.status(400).json({ error: 'At least one field to update must be provided.' });
  }

  try {
    let generatedData: { title: string; tags: string[] } | null = null;
    if (!title && body) {
      const aiResult = await generateTitleAndTags(body);
      title = aiResult.title;
      if (!tags || tags.length === 0) {
        tags = aiResult.tags;
      }
      generatedData = aiResult;
    }

    const { error } = await supabase.rpc('update_note_details', {
      p_note_id: noteId,
      p_title: title,
      p_body: body,
      p_tags: tags,
      p_links_to_add: [],
      p_links_to_remove: [],
    });

    if (error) {
      console.error('Error calling update_note_details RPC:', error);
      return res.status(500).json({ error: 'Failed to update note', detail: error.message });
    }

    const { data: updatedNote, error: fetchError } = await supabase
      .from('notes')
      .select('id, title, body')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch updated note after update:', fetchError);
    }

    if (updatedNote?.body) {
      try {
        await upsertNoteFileSearchDocument({
          noteId,
          userId,
          title: updatedNote.title,
          body: updatedNote.body,
          storeName,
        });
      } catch (e) {
        console.error('Failed to sync File Search after update:', e);
      }
    }

    return res.status(200).json({ message: 'Note updated successfully', generatedData, note: updatedNote });
  } catch (e: any) {
    return res.status(500).json({ error: 'An unexpected error occurred', detail: e.message });
  }
}

export async function handleGetAllNotes(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;
  const { data, error } = await supabase
    .from('notes')
    .select('id,title,body,tags,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(MAX_NOTES);

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch notes', detail: error.message });
  }

  res.status(200).json({ notes: data ?? [] });
}

export async function handleDeleteNote(req: VercelRequest, res: VercelResponse) {
  const auth = await withFileSearchContext(req, res);
  if (!auth) return;
  const { supabase, userId, storeName } = auth;

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const noteId = req.query.noteId as string;
  if (!noteId) {
    return res.status(400).json({ error: 'Missing noteId' });
  }

  try {
    const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', userId);
    if (error) {
      return res.status(500).json({ error: 'Failed to delete note', detail: error.message });
    }

    try {
      await deleteNoteFilesFromStore({ noteId, userId, storeName });
    } catch (e) {
      console.error('Failed to remove File Search documents for deleted note', e);
    }

    return res.status(200).json({ message: 'Note deleted successfully' });
  } catch (e: any) {
    return res.status(500).json({ error: 'An unexpected error occurred', detail: e.message });
  }
}
