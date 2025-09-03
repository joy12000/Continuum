import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../../../lib/auth";

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

  // backlinks = who links TO me
  const { data, error } = await supabase
    .from("note_links")
    .select("from_note_id,to_note_id,notes!note_links_from_note_id_fkey(id,title)")
    .eq("to_note_id", noteId);

  if (error) {
    res.status(500).json({ error: "Failed to fetch backlinks", detail: error.message });
    return;
  }

  const backlinks = (data ?? []).map((row: { from_note_id: string; to_note_id: string; notes: { title: string | null }[] | null }) => ({
    from_note_id: row.from_note_id,
    to_note_id: row.to_note_id,
    title: row.notes?.[0]?.title ?? null
  }));

  res.status(200).json({ note_id: noteId, backlinks });
}
