
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "@lib/auth";
import { supabase } from "@/lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireUser(req, res);
  if (!auth) return;
  const { userId } = auth;

  // Check for an existing running job for the user
  const { data: existingJob, error: existingJobError } = await supabase
    .from('thread_generation_jobs')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])
    .maybeSingle();

  if (existingJobError) {
    return res.status(500).json({ error: "Failed to check for existing jobs", detail: existingJobError.message });
  }

  if (existingJob) {
    return res.status(409).json({ message: "A generation job is already in progress.", jobId: existingJob.id });
  }

  // Insert a new job
  const { data: newJob, error: newJobError } = await supabase
    .from('thread_generation_jobs')
    .insert({ user_id: userId, status: 'pending' })
    .select('id')
    .single();

  if (newJobError) {
    return res.status(500).json({ error: "Failed to create a new job", detail: newJobError.message });
  }

  res.status(202).json({ message: "Job started successfully", jobId: newJob.id });
}
