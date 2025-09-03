
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "@lib/auth";
import { supabase } from "@/lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireUser(req, res);
  if (!auth) return;
  const { userId } = auth;

  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: "jobId is required" });
  }

  const { data: job, error } = await supabase
    .from('thread_generation_jobs')
    .select('status, updated_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // PostgREST error for "Not a single row was returned"
        return res.status(404).json({ error: "Job not found" });
    }
    return res.status(500).json({ error: "Failed to get job status", detail: error.message });
  }

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.status(200).json({ status: job.status, updatedAt: job.updated_at });
}
