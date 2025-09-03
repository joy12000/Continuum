import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../../lib/auth.js";
import type { InsightThread, Note, NoteChunk, NoteLink } from "../../../lib/types.js";
import { prepareNotes, buildCitationSet, buildEdges, cluster, clusterScore } from "../../../lib/compute.js";
import { summarizeThread } from "../../../lib/ai.js";
import { upsertInsightThreadsCache } from "../../../lib/database.js";
import { getSupabaseClient } from "../../../lib/supabaseClient.js";

const MAX_NOTES = parseInt(process.env.CONTINUUM_MAX_NOTES || "400", 10);

async function runThreadGeneration(userId: string, token: string) {
  const supabase = getSupabaseClient(token);

  try {
    // 1) Fetch notes
    const { data: notes, error: nerr } = await supabase
      .from("notes")
      .select("id,title,content,tags,created_at,updated_at")
      .order("created_at", { ascending: true })
      .limit(MAX_NOTES);
    if (nerr) throw new Error(`Failed to fetch notes: ${nerr.message}`);

    const noteIds = (notes ?? []).map((n: any) => n.id);
    if (!noteIds.length) {
      await upsertInsightThreadsCache(supabase, userId, []);
      return;
    }

    // 2) Fetch embeddings and links
    const { data: chunks, error: cerr } = await supabase.from("note_chunks").select("note_id,embedding").in("note_id", noteIds);
    if (cerr) throw new Error(`Failed to fetch chunk embeddings: ${cerr.message}`);

    const { data: links, error: lerr } = await supabase.from("note_links").select("from_note_id,to_note_id").in("from_note_id", noteIds).in("to_note_id", noteIds);
    if (lerr) throw new Error(`Failed to fetch links: ${lerr.message}`);

    // 3) Compute and summarize
    const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);
    const citationSet = buildCitationSet((links as NoteLink[]) ?? []);
    const edges = buildEdges(prepared, citationSet, {});
    const { clusters } = cluster(prepared, edges);

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
        title, summary, notes: groupNotes, size: idxs.length, relevanceScore: score
      });
    }

    out.sort((a, b) => (b.relevanceScore * 0.7 + b.size * 0.3) - (a.relevanceScore * 0.7 + a.size * 0.3));

    // 4) Upsert cache
    await upsertInsightThreadsCache(supabase, userId, out);

  } catch (error: any) {
    console.error('runThreadGeneration failed:', error);
    // Here you might want to update the job status to 'failed' in the database
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId, token } = auth;

  if (req.method === "POST") {
    // Create a new job entry in the database
    const { data: job, error: jobError } = await supabase
      .from('thread_generation_jobs')
      .insert({ user_id: userId, status: 'pending' })
      .select()
      .single();

    if (jobError || !job) {
      return res.status(500).json({ message: 'Failed to create generation job', detail: jobError?.message });
    }

    // Fire-and-forget the long-running task
    runThreadGeneration(userId, token).catch(console.error);

    // Immediately respond with the job ID
    return res.status(202).json({ jobId: job.id });

  } else if (req.method === "GET") {
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'jobId query parameter is required' });
    }

    const { data, error } = await supabase
      .from('thread_generation_jobs')
      .select('status')
      .eq('id', jobId)
      .eq('user_id', userId) // RLS should handle this, but being explicit is safer
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json({ status: data.status });

  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}