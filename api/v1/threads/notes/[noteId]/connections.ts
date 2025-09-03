import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../../../../lib/auth.js";
import type { Note, NoteChunk, NoteLink } from "../../../../../lib/types.js";
import { prepareNotes, buildCitationSet, pairScore, type PreparedNote } from "../../../../../lib/compute.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;

  const noteId = req.query.noteId as string;
  if (!noteId) {
    res.status(400).json({ error: "Missing noteId" });
    return;
  }

  const citation_weight = Number(req.query.citation_weight ?? 1.0) || 1.0;
  const sim_weight = Number(req.query.sim_weight ?? 0.6) || 0.6;
  const tag_weight = Number(req.query.tag_weight ?? 0.2) || 0.2;

  // Fetch all notes minimally plus target
  const { data: notes, error: nerr } = await supabase
    .from("notes")
    .select("id,title,content,tags,created_at,updated_at");

  if (nerr) {
    res.status(500).json({ error: "Failed to fetch notes", detail: nerr.message });
    return;
  }
  const ids = (notes as Note[] ?? []).map((n: Note) => n.id);
  if (!ids.includes(noteId)) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const { data: chunks, error: cerr } = await supabase
    .from("note_embeddings")
    .select("note_id,embedding")
    .in("note_id", ids);

  if (cerr) {
    res.status(500).json({ error: "Failed to fetch chunk embeddings", detail: cerr.message });
    return;
  }

  const { data: links, error: lerr } = await supabase
    .from("note_links")
    .select("from_note_id,to_note_id")
    .in("from_note_id", ids)
    .in("to_note_id", ids);

  if (lerr) {
    res.status(500).json({ error: "Failed to fetch links", detail: lerr.message });
    return;
  }

  const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);
  const idx = prepared.findIndex((p: PreparedNote) => p.note.id === noteId);
  const target = prepared[idx];
  const citationSet = buildCitationSet((links as NoteLink[]) ?? []);

  const results = prepared
    .filter((_: PreparedNote, i: number) => i !== idx)
    .map((p: PreparedNote) => ({
      note_id: p.note.id,
      title: p.note.title,
      score: pairScore(target, p, citationSet, { citation: citation_weight, sim: sim_weight, tag: tag_weight })
    }))
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 50);

  res.status(200).json({ note_id: noteId, connections: results });
}
