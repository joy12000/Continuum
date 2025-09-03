import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../../lib/auth.js";
import type { InsightThread, Note, NoteChunk, NoteLink } from "../../../lib/types.js";
import { prepareNotes, buildCitationSet, buildEdges, cluster, clusterScore } from "../../../lib/compute.js";
import { summarizeThread } from "../../../lib/ai.js";
import { upsertInsightThreadsCache } from "../../../lib/database.js";

const MAX_NOTES = parseInt(process.env.CONTINUUM_MAX_NOTES || "400", 10);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;

  // weights from JSON body or query fallback
  const body = (req.body && typeof req.body === "object") ? req.body as any : {};
  const citation_weight = Number(body.citation_weight ?? req.query.citation_weight ?? 1.0) || 1.0;
  const sim_weight = Number(body.sim_weight ?? req.query.sim_weight ?? 0.6) || 0.6;
  const tag_weight = Number(body.tag_weight ?? req.query.tag_weight ?? 0.2) || 0.2;

  // 1) Fetch notes (owned by user via RLS)
  const { data: notes, error: nerr } = await supabase
    .from("notes")
    .select("id,title,content,tags,created_at,updated_at")
    .order("created_at", { ascending: true })
    .limit(MAX_NOTES);

  if (nerr) {
    res.status(500).json({ error: "Failed to fetch notes", detail: nerr.message });
    return;
  }

  const noteIds = (notes ?? []).map((n: any) => n.id);
  if (!noteIds.length) {
    const { lastUpdatedAt, error } = await upsertInsightThreadsCache(supabase, userId, []);
    if (error) {
      res.status(500).json({ error: "Failed to update cache", detail: error });
      return;
    }
    res.status(200).json({ threads: [], lastUpdatedAt });
    return;
  }

  // 2) Fetch embeddings
  const { data: chunks, error: cerr } = await supabase
    .from("note_chunks")
    .select("note_id,embedding")
    .in("note_id", noteIds);

  if (cerr) {
    res.status(500).json({ error: "Failed to fetch chunk embeddings", detail: cerr.message });
    return;
  }

  // 3) Fetch citation links
  const { data: links, error: lerr } = await supabase
    .from("note_links")
    .select("from_note_id,to_note_id")
    .in("from_note_id", noteIds)
    .in("to_note_id", noteIds);

  if (lerr) {
    res.status(500).json({ error: "Failed to fetch links", detail: lerr.message });
    return;
  }

  const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);
  const citationSet = buildCitationSet((links as NoteLink[]) ?? []);
  const edges = buildEdges(prepared, citationSet, { citation: citation_weight, sim: sim_weight, tag: tag_weight });
  const { clusters } = cluster(prepared, edges);

  // 4) Summaries per cluster
  const out: InsightThread[] = [];
  for (const idxs of clusters) {
    const groupNotes = idxs.map((i) => prepared[i].note);
    if (!groupNotes.length) continue;

    let title = "Insight Thread", summary = "";
    try {
      const s = await summarizeThread(groupNotes);
      title = s.title || title;
      summary = s.summary || summary;
    } catch (e: any) {
      summary = `Summary unavailable: ${e?.message ?? "LLM error"}`;
    }
    const score = clusterScore(idxs, edges);
    out.push({
      threadId: idxs.map((i) => prepared[i].note.id).join("_"),
      title,
      summary,
      notes: groupNotes,
      size: idxs.length,
      relevanceScore: score
    });
  }

  // Sort threads by combined size/score importance
  out.sort((a, b) => (b.relevanceScore * 0.7 + b.size * 0.3) - (a.relevanceScore * 0.7 + a.size * 0.3));

  // 5) Upsert cache
  const { lastUpdatedAt, error: uerr } = await upsertInsightThreadsCache(supabase, userId, out);
  if (uerr) {
    res.status(500).json({ error: "Failed to update cache", detail: uerr });
    return;
  }

  res.status(200).json({ threads: out, lastUpdatedAt });
}
