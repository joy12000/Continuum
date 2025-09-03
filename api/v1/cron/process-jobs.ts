
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../../src/lib/supabase";
import { prepareNotes, buildCitationSet, buildEdges, cluster, clusterScore } from "../../../lib/compute";
import { summarizeThread } from "../../../lib/ai";
import { upsertInsightThreadsCache } from "../../../lib/database";
import type { Note, NoteChunk, NoteLink, InsightThread } from "../../../lib/types";

const MAX_NOTES = parseInt(process.env.CONTINUUM_MAX_NOTES || "400", 10);
const CRON_SECRET = process.env.CRON_SECRET;

async function runThreadGeneration(userId: string) {
    // This is the core logic from the original generate.ts file
    const { data: notes, error: nerr } = await supabase
        .from("notes")
        .select("id,title,content,tags,created_at,updated_at")
        .eq('user_id', userId)
        .order("created_at", { ascending: true })
        .limit(MAX_NOTES);

    if (nerr) throw new Error(`Failed to fetch notes: ${nerr.message}`);

    const noteIds = (notes as Note[] ?? []).map((n: Note) => n.id);
    if (!noteIds.length) {
        await upsertInsightThreadsCache(supabase, userId, []);
        return;
    }

    const { data: chunks, error: cerr } = await supabase
        .from("note_embeddings")
        .select("note_id,embedding")
        .in("note_id", noteIds);

    if (cerr) throw new Error(`Failed to fetch chunk embeddings: ${cerr.message}`);

    const { data: links, error: lerr } = await supabase
        .from("note_links")
        .select("from_note_id,to_note_id")
        .in("from_note_id", noteIds)
        .in("to_note_id", noteIds);

    if (lerr) throw new Error(`Failed to fetch links: ${lerr.message}`);

    const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);
    const citationSet = buildCitationSet((links as NoteLink[]) ?? []);
    // Using default weights for now, can be customized later if needed
    const edges = buildEdges(prepared, citationSet, { citation: 1.0, sim: 0.6, tag: 0.2 });
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
            title,
            summary,
            notes: groupNotes, // Changed from note_ids to full note objects
            relevanceScore: score, // Changed from score
            size: idxs.length
        });
    }

    out.sort((a, b) => (b.relevanceScore * 0.7 + b.size * 0.3) - (a.relevanceScore * 0.7 + a.size * 0.3));

    await upsertInsightThreadsCache(supabase, userId, out);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: pendingJobs, error: fetchError } = await supabase
        .from('thread_generation_jobs')
        .select('id, user_id')
        .eq('status', 'pending')
        .limit(5); // Process 5 jobs at a time to avoid overload

    if (fetchError) {
        return res.status(500).json({ error: 'Failed to fetch pending jobs', detail: fetchError.message });
    }

    if (!pendingJobs || pendingJobs.length === 0) {
        return res.status(200).json({ message: 'No pending jobs to process.' });
    }

    const results = [];
    for (const job of pendingJobs) {
        try {
            // 1. Set status to processing
            await supabase.from('thread_generation_jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', job.id);

            // 2. Run the actual generation logic
            await runThreadGeneration(job.user_id);

            // 3. Set status to completed
            await supabase.from('thread_generation_jobs').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', job.id);
            results.push({ jobId: job.id, status: 'completed' });

        } catch (error: any) {
            // 4. Set status to failed
            await supabase.from('thread_generation_jobs').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', job.id);
            results.push({ jobId: job.id, status: 'failed', error: error.message });
        }
    }

    res.status(200).json({ message: `Processed ${pendingJobs.length} jobs.`, results });
}
