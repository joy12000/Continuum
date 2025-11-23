import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../supabaseClient.js';
import { requireUser } from '../auth.js';
import type { InsightThread, Note, NoteChunk } from '../types.js';
import { getInsightThreadsCache, upsertInsightThreadsCache } from '../database.js';
import {
  prepareNotes,
  cluster,
  clusterLPA,
  clusterByAutoThreshold,
  clusterHybrid,
  clusterScore,
  normalizeEdges,
} from '../compute.js';
import { summarizeThread } from '../ai.js';
import { envNum, envBool01, MAX_NOTES } from '../config.js';

const absorbSingletons = (
  clustersIn: number[][],
  edgesIn: { i: number; j: number; score: number }[],
) => {
  const out: number[][] = [];
  const singles: number[][] = [];
  const adj = new Map<number, { j: number; w: number }[]>();
  for (const e of edgesIn) {
    if (!adj.has(e.i)) adj.set(e.i, []);
    if (!adj.has(e.j)) adj.set(e.j, []);
    adj.get(e.i)!.push({ j: e.j, w: e.score });
    adj.get(e.j)!.push({ j: e.i, w: e.score });
  }
  for (const c of clustersIn) (c.length === 1 ? singles : out).push(c);
  if (!singles.length || !out.length) return clustersIn;

  for (const [v] of singles) {
    let best = -1,
      bestSum = 0;
    const neigh = adj.get(v) ?? [];
    for (let ci = 0; ci < out.length; ci++) {
      const members = out[ci];
      let s = 0;
      for (const { j, w } of neigh) if (members.includes(j)) s += w;
      if (s > bestSum) {
        bestSum = s;
        best = ci;
      }
    }
    if (best >= 0 && bestSum > 0.05) out[best].push(v);
    else out.push([v]);
  }
  return out;
};

async function runThreadGeneration(jobId: string, userId: string, token: string, excludeSingletons: boolean) {
  const supabase = getSupabaseClient(token);
  const updateJobStatus = async (status: string) => {
    const { error } = await supabase
      .from('thread_generation_jobs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', jobId);
    if (error) console.error(`Failed to update job ${jobId} status to ${status}:`, error);
  };

  try {
    await updateJobStatus('processing');

    const { data: notes, error: nerr } = await supabase
      .from("notes")
      .select("id,title,body,tags,created_at,updated_at")
      .order("created_at", { ascending: true })
      .limit(MAX_NOTES);

    if (nerr) throw new Error(`Failed to fetch notes: ${nerr.message}`);

    const noteIds = (notes ?? []).map((n: any) => n.id);
    if (!noteIds.length) {
      await upsertInsightThreadsCache(supabase, userId, []);
      await updateJobStatus('completed');
      return;
    }

    const { data: chunks, error: cerr } = await supabase
      .from("note_chunks")
      .select("note_id,embedding")
      .in("note_id", noteIds);

    if (cerr) throw new Error(`Failed to fetch chunk embeddings: ${cerr.message}`);

    const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);

    const minEdge = envNum('CONTINUUM_MIN_EDGE', 0.02);
    const { data: edges, error: edgesError } = await supabase.rpc('get_all_edges', {
      minimum_weight: minEdge
    });
    if (edgesError) throw new Error(`Failed to build edges: ${edgesError.message}`);
    const rawEdges = (edges ?? []) as any;
    const normalizedEdges = normalizeEdges(prepared, rawEdges);

    const CLUSTER_METHOD = process.env.CONTINUUM_CLUSTER_METHOD ?? "hybrid";
    const method = String(CLUSTER_METHOD).toLowerCase();

    let clusters: number[][];

    if (method === "legacy") {
      clusters = cluster(prepared, rawEdges).clusters;
    } else if (method === "lpa") {
      clusters = clusterLPA(prepared, rawEdges, {
        minEdge: 0,
        minClusterSize: 2
      }).clusters;
    } else if (method === "auto") {
      const kMin = envNum('CONTINUUM_KMIN', 3);
      const kMax = envNum('CONTINUUM_KMAX', 12);
      clusters = clusterByAutoThreshold(prepared, rawEdges, {
        kMin,
        kMax
      }).clusters;
    } else {
      const kMin    = envNum('CONTINUUM_KMIN', 4);
      const kMax    = envNum('CONTINUUM_KMAX', 12);
      const knnK    = Math.max(1, Math.min(64, envNum('CONTINUUM_CLUSTER_K', 8)));
      const mutual  = envBool01('CONTINUUM_CLUSTER_MUTUAL', true);

      clusters = clusterHybrid(prepared, rawEdges, {
        kMin, kMax,
        minEdge: 0,
        minClusterSize: 2,
        knnK,
        mutual
      }).clusters;

      if (excludeSingletons) {
        clusters = absorbSingletons(clusters, rawEdges);
      }
    }

    const MIN_CLUSTER_SIZE = envNum('CONTINUUM_MIN_CLUSTER', 2);
    const filtered = clusters.filter((c) => c.length >= MIN_CLUSTER_SIZE);
    const threads: InsightThread[] = [];
    for (const cluster of filtered) {
      const items = cluster.map((idx) => prepared[idx]);
      const noteObjs = items.map((i) => i.note);
      const { title, summary } = await summarizeThread(noteObjs);
      threads.push({
        threadId: `thread-${items[0].note.id}-${items.length}`,
        title,
        summary,
        notes: noteObjs,
        relevanceScore: clusterScore(cluster, normalizedEdges),
        size: noteObjs.length,
      });
    }

    await upsertInsightThreadsCache(supabase, userId, threads);
    await updateJobStatus('completed');
  } catch (error) {
    console.error(`Thread generation job ${jobId} failed:`, error);
    await updateJobStatus('failed');
  }
}

export async function handleGetThreads(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;

  const sanitizeThread = (t: InsightThread) => ({
    ...t,
    relevanceScore: Number.isFinite(t?.relevanceScore) ? Number(t.relevanceScore) : 0,
    size: Number.isFinite(t?.size) ? Number(t.size) : t.notes?.length ?? 0,
  });

  const { threads, lastUpdatedAt } = await getInsightThreadsCache(supabase, userId);
  const safeThreads = (threads ?? []).map(sanitizeThread);
  const lastUpdatedAtMs = lastUpdatedAt ? Date.parse(lastUpdatedAt) : null;

  res.status(200).json({ threads: safeThreads, lastUpdatedAt, lastUpdatedAtMs });
}

export async function handleGenerateThread(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId, token } = auth;

  if (req.method === "POST") {
    const excludeSingletons =
      String(req.body?.excludeSingletons ?? 'false').toLowerCase() === 'true';

    const { data: job, error: jobError } = await supabase
      .from('thread_generation_jobs')
      .insert({ user_id: userId, status: 'pending' })
      .select()
      .single();

    if (jobError || !job) {
      return res.status(500).json({ message: 'Failed to create generation job', detail: jobError?.message });
    }

    runThreadGeneration(job.id, userId, token, excludeSingletons).catch(console.error);
    return res.status(202).json({ jobId: job.id, excludeSingletons });

  } else if (req.method === "GET") {
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'jobId query parameter is required' });
    }
    const { data, error } = await supabase
      .from('thread_generation_jobs')
      .select('status')
      .eq('id', jobId)
      .eq('user_id', userId)
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
