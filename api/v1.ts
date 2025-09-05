import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TaskType } from '@google/generative-ai';

// Base imports
import { getEmbedding, getGenerativeModel } from './shared-lib/generativeai.js';
import { requireUser } from './shared-lib/auth.js';
import { getSupabaseClient } from './shared-lib/supabaseClient.js';
import type { InsightThread, Note, NoteChunk } from './shared-lib/types.js';
import { getInsightThreadsCache, upsertInsightThreadsCache } from './shared-lib/database.js';
import { summarizeThread, summarizeDay } from './shared-lib/ai.js';
import {
  prepareNotes,
  cluster,                 // legacy
  clusterLPA,              // lpa
  clusterByAutoThreshold,  // auto
  clusterHybrid,           // hybrid (fallback)
  clusterScore,
} from './shared-lib/compute.js';

export const config = { runtime: 'nodejs' };

// --- HELPERS ---

function pickSupabase(req: VercelRequest): SupabaseClient | null {
  const hasAuth = !!req.headers.authorization;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (hasAuth && anon) {
    const token = req.headers.authorization!.split(' ')?.[1];
    return createClient(process.env.SUPABASE_URL!, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
  }
  return null;
}

const MAX_NOTES = parseInt(process.env.CONTINUUM_MAX_NOTES || "400", 10);

const envNum = (name: string, def: number) => {
  const v = process.env[name];
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const envBool01 = (name: string, def: boolean) => {
  const v = process.env[name];
  if (v == null) return def;
  return v === '1' || v.toLowerCase() === 'true';
};

// --- THREAD GENERATION (async job) ---

async function runThreadGeneration(jobId: string, userId: string, token: string) {
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

    // Precomputed edges via RPC (server-side SQL for speed)
    const minEdge = envNum('CONTINUUM_MIN_EDGE', 0.02);
    const { data: edges, error: edgesError } = await supabase.rpc('get_all_edges', {
      minimum_weight: minEdge
    });
    if (edgesError) throw new Error(`Failed to build edges: ${edgesError.message}`);

    const { data: chunks, error: cerr } = await supabase
      .from("note_chunks")
      .select("note_id,embedding")
      .in("note_id", noteIds);

    if (cerr) throw new Error(`Failed to fetch chunk embeddings: ${cerr.message}`);

    const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);

    // === Cluster method selection (env-driven) =======================
    const CLUSTER_METHOD = process.env.CONTINUUM_CLUSTER_METHOD ?? "hybrid";
    const method = String(CLUSTER_METHOD).toLowerCase();

    let clusters: number[][];

    try {
      if (method === "legacy") {
        // Simple DSU + threshold (autoThreshold inside)
        clusters = cluster(prepared, edges as any).clusters;

      } else if (method === "lpa") {
        // Label Propagation (no hard threshold)
        clusters = clusterLPA(prepared, edges as any, {
          minEdge: 0, // Already filtered in DB
          minClusterSize: 2
        }).clusters;

      } else if (method === "auto") {
        // Auto threshold to fit k range + modularity
        const kMin = envNum('CONTINUUM_KMIN', 3);
        const kMax = envNum('CONTINUUM_KMAX', 12);
        clusters = clusterByAutoThreshold(prepared, edges as any, {
          kMin,
          kMax
        }).clusters;

      } else {
        // HYBRID: LPA → if out-of-range => AUTO; isolation, kNN sparsify, MST fallback, absorb singletons
        const kMin    = envNum('CONTINUUM_KMIN', 4);   // slightly higher default to reduce over-splitting
        const kMax    = envNum('CONTINUUM_KMAX', 12);
        const knnK    = Math.max(1, Math.min(64, envNum('CONTINUUM_CLUSTER_K', 8)));
        const mutual  = envBool01('CONTINUUM_CLUSTER_MUTUAL', true);

        clusters = clusterHybrid(prepared, edges as any, {
          kMin, kMax,
          minEdge: 0, // Already filtered in DB
          minClusterSize: 2,
          knnK,
          mutual
        }).clusters;

        // ── [absorbSingletons] 고립 아닌 싱글톤은 가장 잘 맞는 군집으로 흡수 ──
        function absorbSingletons(
          clustersIn: number[][],
          edgesIn: { i: number; j: number; score: number }[]
        ) {
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
            let best = -1, bestSum = 0;
            const neigh = adj.get(v) ?? [];
            for (let ci = 0; ci < out.length; ci++) {
              const members = out[ci];
              let s = 0;
              for (const { j, w } of neigh) if (members.includes(j)) s += w;
              if (s > bestSum) { bestSum = s; best = ci; }
            }
            if (best >= 0 && bestSum > 0.05) out[best].push(v);
            else out.push([v]);
          }
          return out;
        }
        clusters = absorbSingletons(clusters, edges as any);
      }
    } catch (e) {
      // Fallback safety: use legacy
      console.error('[cluster] fallback to legacy due to error:', e);
      clusters = cluster(prepared, edges as any).clusters;
    }
    // === /Cluster method selection ===================================

    // Build response threads (LLM summaries with safe numeric fields)
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

      const rawScore = clusterScore(idxs, edges as any);
      const safeScore = Number.isFinite(rawScore) ? rawScore : 0;

      out.push({
        id: idxs.map((i) => prepared[i].note.id).join("_"),
        title,
        summary,
        note_ids: idxs.map((i) => prepared[i].note.id),
        notes: groupNotes,
        size: idxs.length,
        score: safeScore,
      });
    }

    // Sort: cohesion first, then size
    out.sort((a, b) => (b.score * 0.7 + b.size * 0.3) - (a.score * 0.7 + a.size * 0.3));

    await upsertInsightThreadsCache(supabase, userId, out);
    await updateJobStatus('completed');
  } catch (error: any) {
    console.error(`runThreadGeneration failed for job ${jobId}:`, error);
    await updateJobStatus('failed');
  }
}

// --- ACTION HANDLERS ---

async function handleSearch(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Vercel Environment Variable Check:');
    console.log(`- SUPABASE_URL is set: ${!!process.env.SUPABASE_URL}`)
    console.log(`- SUPABASE_SERVICE_KEY is set: ${!!process.env.SUPABASE_SERVICE_KEY}`)
    console.log(`- GEMINI_API_KEY is set: ${!!process.env.GEMINI_API_KEY}`)
    console.log(`- GOOGLE_API_KEY is set: ${!!process.env.GOOGLE_API_KEY}`)

    const rawQ = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const q = (rawQ ?? '').toString().trim();
    if (!q) return res.status(200).json([]);

    const qUid = Array.isArray(req.query.uid) ? req.query.uid[0] : req.query.uid;
    const hUid = (req.headers['x-user-id'] as string | undefined) || '';
    const uid = (qUid || hUid || '').toString().trim();
    const finalUid = uid === '' ? null : uid;

    if (!finalUid) {
      return res.status(400).json({ error: 'User ID is required for search.' });
    }

    const sb = pickSupabase(req);
    if (!sb) return res.status(401).json({ error: 'Authentication required.' });

    const qEmb = await getEmbedding(q, TaskType.RETRIEVAL_QUERY);
    const limit_k = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 12;

    const args: any = {
      limit_k,
      q_emb: qEmb,
      uid: finalUid
    };
    const { data, error } = await sb.rpc('search_chunks', args);

    if (error) return res.status(500).json({ error: `[supabase] ${error.message}` });
    return res.status(200).json(data || []);
  } catch (e: any) {
    const msg = e?.message || 'v1 failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[unknown] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

async function handleCreateGeminiEmbedding(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { texts } = req.body;
    if (!texts || !Array.isArray(texts) || texts.some(t => typeof t !== 'string')) {
      return res.status(400).json({ error: '`texts` field must be an array of strings.' });
    }

    const embeddings = await Promise.all(
      texts.map(text => getEmbedding(text, TaskType.RETRIEVAL_DOCUMENT))
    );

    return res.status(200).json({ embeddings });
  } catch (e: any) {
    const msg = e?.message || 'Failed to create Gemini embedding';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[google] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

async function handleGenerate(req: VercelRequest, res: VercelResponse) {
  try {
    const { input, context } = req.body;
    if (!input || !context) {
      return res.status(400).json({ error: 'input and context are required.' });
    }

    const model = getGenerativeModel();
    const prompt = `Based on the following context, write a concise and relevant summary of the main text provided below. Only use information from the provided context. Answer in Korean.\n\nContext:\n${JSON.stringify(context)}\n\nMain Text to Summarize:\n${input.query}\n\nSummary:`
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });

  } catch (e: any) {
    const msg = e?.message || 'Generate handler failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[google] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

async function handleCalendar(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const token = req.headers.authorization?.split(' ')?.[1];
    if (!token) {
      return res.status(401).json({ error: '[config] Authentication token not provided.' });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { start_date, end_date } = req.query;
    if (!start_date || !end_date || typeof start_date !== 'string' || typeof end_date !== 'string') {
      return res.status(400).json({ error: 'start_date and end_date query parameters are required.' });
    }

    const { data, error } = await supabase.rpc('get_notes_activity', {
      start_date_str: start_date,
      end_date_str: end_date,
    });

    if (error) throw error;
    return res.status(200).json(data || []);

  } catch (e: any) {
    if (e.message.includes('JWT')) {
      return res.status(401).json({ error: '[supabase] Invalid authentication token.' });
    }
    const msg = e?.message || 'Calendar handler failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[supabase] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

async function handleGetThreads(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;

  const sanitizeThread = (t: any) => {
    const score = Number.isFinite(t?.score) ? Number(t.score) : 0;
    const size  = Number.isFinite(t?.size)  ? Number(t.size)  : Array.isArray(t?.note_ids) ? t.note_ids.length : 0;
    return { ...t, score, size };
  };

  const { threads, lastUpdatedAt } = await getInsightThreadsCache(supabase, userId);
  const safeThreads = (threads ?? []).map(sanitizeThread);
  const lastUpdatedAtMs = lastUpdatedAt ? Date.parse(lastUpdatedAt) : null;

  res.status(200).json({ threads: safeThreads, lastUpdatedAt, lastUpdatedAtMs });
}

async function handleGenerateThread(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId, token } = auth;

  if (req.method === "POST") {
    const { data: job, error: jobError } = await supabase
      .from('thread_generation_jobs')
      .insert({ user_id: userId, status: 'pending' })
      .select()
      .single();

    if (jobError || !job) {
      return res.status(500).json({ message: 'Failed to create generation job', detail: jobError?.message });
    }

    // fire and forget
    runThreadGeneration(job.id, userId, token).catch(console.error);
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

async function handleGetNote(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
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

  res.status(200).json(data);
}

async function handleUpdateNote(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const noteId = req.query.noteId as string;
  if (!noteId) {
    return res.status(400).json({ error: 'Missing noteId' });
  }

  const {
    title,
    body,
    tags,
    links_to_add,
    links_to_remove
  } = req.body;

  if (title === undefined && body === undefined && tags === undefined && links_to_add === undefined && links_to_remove === undefined) {
    return res.status(400).json({ error: 'At least one field to update must be provided.' });
  }

  try {
    const { error } = await supabase.rpc('update_note_details', {
      p_note_id: noteId,
      p_title: title,
      p_body: body,
      p_tags: tags,
      p_links_to_add: links_to_add,
      p_links_to_remove: links_to_remove,
    });

    if (error) {
      console.error('Error calling update_note_details RPC:', error);
      return res.status(500).json({ error: 'Failed to update note', detail: error.message });
    }

    return res.status(200).json({ message: 'Note updated successfully' });
  } catch (e: any) {
    return res.status(500).json({ error: 'An unexpected error occurred', detail: e.message });
  }
}

async function handleGetBacklinks(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
  const noteId = req.query.noteId as string;
  if (!noteId) {
    return res.status(400).json({ error: "Missing noteId" });
  }
  const { data, error } = await supabase
    .from("note_links")
    .select("from_note_id,to_note_id,notes!note_links_from_note_id_fkey(id,title)")
    .eq("to_note_id", noteId);

  if (error) {
    return res.status(500).json({ error: "Failed to fetch backlinks", detail: error.message });
  }
  const backlinks = (data ?? []).map((row: any) => ({
    from_note_id: row.from_note_id,
    to_note_id: row.to_note_id,
    title: row.notes?.[0]?.title ?? null
  }));
  res.status(200).json({ note_id: noteId, backlinks });
}

async function handleGetConnections(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
  const noteId = req.query.noteId as string;
  if (!noteId) {
    return res.status(400).json({ error: "Missing noteId" });
  }

  // 가중치: 쿼리 제공 없으면 DB RPC의 기본값을 사용
  const sim_w = req.query.sim_weight ? Number(req.query.sim_weight) : undefined;
  const citation_w = req.query.citation_weight ? Number(req.query.citation_weight) : undefined;
  const tag_w = req.query.tag_weight ? Number(req.query.tag_weight) : undefined;

  const { data, error } = await supabase.rpc('get_connections_for_note', {
    target_note_id: noteId,
    sim_w,
    citation_w,
    tag_w
  });

  if (error) {
    return res.status(500).json({ error: "Failed to fetch connections", detail: error.message });
  }

  return res.status(200).json({ note_id: noteId, connections: data });
}

async function handleGetAllNotes(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to fetch notes", detail: error.message });
  }

  res.status(200).json(data || []);
}

async function handleGetNotesForDate(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;

  const date = req.query.date as string;
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: "Missing or invalid 'date' query parameter" });
  }

  const { data, error } = await supabase.rpc('get_notes_for_date', {
    target_date_str: date,
  });

  if (error) {
    return res.status(500).json({ error: "Failed to fetch notes for date", detail: error.message });
  }

  return res.status(200).json(data || []);
}

async function handleSummarizeDay(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { notes } = req.body;
  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    return res.status(400).json({ error: '`notes` field must be a non-empty array of note objects.' });
  }

  try {
    const summary = await summarizeDay(notes as Note[]);
    return res.status(200).json(summary);
  } catch (e: any) {
    console.error('Failed to generate daily summary:', e);
    const msg = e?.message || 'Failed to generate daily summary';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[google] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

// --- MAIN ROUTER ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

    switch (action) {
      case 'search':
        return await handleSearch(req, res);
      case 'create-embedding':
      case 'create-gemini-embedding':
        return await handleCreateGeminiEmbedding(req, res);
      case 'generate':
        return await handleGenerate(req, res);
      case 'calendar':
        return await handleCalendar(req, res);
      case 'get-threads':
        return await handleGetThreads(req, res);
      case 'generate-thread':
        return await handleGenerateThread(req, res);
      case 'get-backlinks':
        return await handleGetBacklinks(req, res);
      case 'get-connections':
        return await handleGetConnections(req, res);
      case 'get-all-notes':
        return await handleGetAllNotes(req, res);
      case 'get-note':
        return await handleGetNote(req, res);
      case 'get-notes-for-date':
        return await handleGetNotesForDate(req, res);
      case 'summarize-day':
        return await handleSummarizeDay(req, res);
      case 'update-note':
        return await handleUpdateNote(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e: any) {
    const msg = e?.message || 'API handler failed';
    return res.status(500).json({ error: msg });
  }
}
