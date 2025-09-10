import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TaskType } from '@google/generative-ai';

// Base imports
import { getEmbedding, getGenerativeModel } from './shared-lib/generativeai.js';
import { requireUser } from './shared-lib/auth.js';
import { getSupabaseClient } from './shared-lib/supabaseClient.js';
import type { InsightThread, Note, NoteChunk } from './shared-lib/types.js';
import { getInsightThreadsCache, upsertInsightThreadsCache } from './shared-lib/database.js';
import { summarizeThread, summarizeDay, generateTitleAndTags, connectNewNote } from './shared-lib/ai.js';
import {
  prepareNotes,
  cluster,                 // legacy
  clusterLouvain,          // louvain
  clusterLPA,              // lpa
  clusterByAutoThreshold,  // auto
  clusterScore,
  clusterHybrid,
  normalizeEdges,
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

/**
 * Post-processing step for clustering. Finds singleton clusters and attempts to merge
 * them into the most relevant larger cluster based on connection weights.
 * @param clustersIn - The initial list of clusters (arrays of node indices).
 * @param edgesIn - The list of all edges in the graph.
 * @returns A new list of clusters with singletons absorbed where possible.
 */
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

// --- THREAD GENERATION (async job) ---

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
        clusters = absorbSingletons(clusters, edges as any);
      }
    } catch (e) {
      // Fallback safety: use legacy
      console.error('[cluster] fallback to legacy due to error:', e);
      clusters = cluster(prepared, edges as any).clusters;
    }
    // === /Cluster method selection ===================================

    let finalClusters = clusters;
    console.log(`[runThreadGeneration] excludeSingletons: ${excludeSingletons}`); // Log the input parameter
    console.log(`[runThreadGeneration] Clusters before filtering (${clusters.length} clusters):`, clusters.map(c => c.length)); // Log cluster sizes before filter
    if (excludeSingletons) {
      finalClusters = clusters.filter(c => c.length > 1);
      console.log(`[runThreadGeneration] Clusters after filtering (${finalClusters.length} clusters):`, finalClusters.map(c => c.length)); // Log cluster sizes after filter
    }

    // Build response threads (LLM summaries with safe numeric fields)
    const out: InsightThread[] = [];
    for (const idxs of finalClusters) {
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

async function handleFindContextCluster(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;

  const noteId = req.query.noteId as string;
  if (!noteId) {
    return res.status(400).json({ error: "Missing noteId" });
  }

  try {
    // 1. Get candidate notes (the new note + its top connections)
    const { data: connections, error: connError } = await supabase.rpc('get_connections_for_note', {
      target_note_id: noteId,
      match_count: 20 // Get a decent number of candidates
    });
    if (connError) throw new Error(`Failed to get connections: ${connError.message}`);

    const candidateNoteIds = [...new Set([noteId, ...(connections || []).map((c: any) => c.note_id)])];

    if (candidateNoteIds.length <= 1) {
      return res.status(200).json({ contextNoteIds: [noteId] });
    }

    // 2. Fetch full data for these candidates
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("id,title,body,tags,created_at,updated_at")
      .in("id", candidateNoteIds);
    if (notesError) throw new Error(`Failed to fetch candidate notes: ${notesError.message}`);
    if (!notes || notes.length === 0) {
        return res.status(200).json({ contextNoteIds: [noteId] });
    }

    // 3. Fetch necessary data for clustering (chunks and edges for the subgraph)
    const { data: chunks, error: chunksError } = await supabase
      .from("note_chunks")
      .select("note_id,embedding")
      .in("note_id", candidateNoteIds);
    if (chunksError) throw new Error(`Failed to fetch chunks: ${chunksError.message}`);

    const { data: edges, error: edgesError } = await supabase.rpc('get_edges_for_subgraph', {
      p_note_ids: candidateNoteIds
    });
    if (edgesError) throw new Error(`Failed to get subgraph edges: ${edgesError.message}`);

    // 4. Run clustering
    const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);
    const normalizedEdges = normalizeEdges(prepared, edges as any);

    // === Cluster method selection (env-driven) =======================
    const CLUSTER_METHOD = process.env.CONTINUUM_CLUSTER_METHOD ?? "hybrid";
    const method = String(CLUSTER_METHOD).toLowerCase();
    let clusters: number[][];

    if (method === 'louvain') {
      clusters = clusterLouvain(prepared, normalizedEdges as any, {
        minClusterSize: 1, // Allow single-note clusters
      }).clusters;
    } else { // Default to hybrid
      const { clusters: initialClusters } = clusterHybrid(prepared, normalizedEdges, {
        kMin: 1, kMax: 5, minClusterSize: 1
      });
      clusters = absorbSingletons(initialClusters, normalizedEdges as any);
    }
    // === /Cluster method selection ===================================


    // 5. Find the cluster containing the new note
    const noteIndex = prepared.findIndex(p => p.note.id === noteId);
    let contextCluster: number[] = noteIndex !== -1 ? [noteIndex] : [];
    if (noteIndex !== -1) {
        const foundCluster = clusters.find(c => c.includes(noteIndex));
        if (foundCluster) contextCluster = foundCluster;
    }

    const contextNoteIds = contextCluster.map(idx => prepared[idx].note.id);
    return res.status(200).json({ contextNoteIds });

  } catch (e: any) {
    console.error(`handleFindContextCluster failed:`, e);
    return res.status(500).json({ error: e.message });
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

    // Use the dedicated, structured AI function for better maintainability and prompting
    const result = await connectNewNote(input.query, context);

    // The result is already a JSON object like { summary: "..." }
    return res.status(200).json({
      data: result,
    });

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

    // fire and forget
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

  const note = {
    ...data,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
  delete (note as any).created_at;
  delete (note as any).updated_at;

  res.status(200).json(note);
}

async function handleUpdateNote(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const noteId = req.query.noteId as string;
  if (!noteId) {
    return res.status(400).json({ error: 'Missing noteId' });
  }

  let {
    title,
    body,
    tags,
  } = req.body;

  if (title === undefined && body === undefined && tags === undefined) {
    return res.status(400).json({ error: 'At least one field to update must be provided.' });
  }

  try {
    let generatedData: { title: string; tags: string[] } | null = null;
    // Auto-generate title and tags if title is empty but body is not.
    if (!title && body) {
      const aiResult = await generateTitleAndTags(body);
      title = aiResult.title;
      // If user didn't provide tags, use the generated ones.
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
      p_links_to_add: [], // Link editing is a separate feature, keeping this simple
      p_links_to_remove: [],
    });

    if (error) {
      console.error('Error calling update_note_details RPC:', error);
      return res.status(500).json({ error: 'Failed to update note', detail: error.message });
    }

    // Return the generated data so the frontend can update its state if needed
    return res.status(200).json({ message: 'Note updated successfully', generatedData });
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

  // 환경값 + 쿼리값 파싱 (NaN 가드 포함)
  const K_ENV   = Number(process.env.CONTINUUM_CONN_K ?? 12);
  const MIN_ENV = Number(process.env.CONTINUUM_CONN_MIN ?? 0.05);
  const MUT_ENV = String(process.env.CONTINUUM_CONN_MUTUAL ?? "false") === "true";

  const kRaw   = Number(req.query.k ?? K_ENV);
  const minRaw = Number(req.query.min_score ?? MIN_ENV);
  const K         = Number.isFinite(kRaw)   && kRaw   > 0 ? kRaw   : K_ENV;
  const MIN_SCORE = Number.isFinite(minRaw) && minRaw >= 0 ? minRaw : MIN_ENV;

  // mutual: 현재는 표시만 (실적용하려면 get_connections_knn RPC 분기 필요)
  const MUTUAL    = String(req.query.mutual ?? String(MUT_ENV)) === "true";

  // 가중치: 프런트 쿼리 없으면 기본값
  const sim_w       = req.query.sim_weight       ? Number(req.query.sim_weight)       : 0.7;
  const citation_w  = req.query.citation_weight  ? Number(req.query.citation_weight)  : 0.2;
  const tag_w       = req.query.tag_weight       ? Number(req.query.tag_weight)       : 0.1;

  const { data, error } = await supabase.rpc('get_connections_for_note', {
    target_note_id: noteId,
    sim_w, citation_w, tag_w
  });
  if (error) {
    return res.status(500).json({ error: "Failed to fetch connections", detail: error.message });
  }

  // 1) 점수 NaN/NULL 방지 → 2) 점수컷 → 3) 내림차순 정렬 → 4) Top-K
  const conns = (data ?? [])
    .map((d: any) => ({
      note_id: d.note_id,
      title: d.title ?? null,
      score: Number.isFinite(Number(d.score)) ? Number(d.score) : 0
    }))
    .filter(d => d.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, K);

  return res.status(200).json({
    note_id: noteId,
    connections: conns,
    meta: {
      k: K,
      min_score: MIN_SCORE,
      mutual_requested: MUTUAL,   // 현재는 적용 안 함(표시만)
      mutual_applied: true,      // ← 실제 mutual kNN 적용 시 true로 바꿔
      weights: { sim: sim_w, citation: citation_w, tag: tag_w }
    }
  });
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

  const notes = (data || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));

  res.status(200).json(notes);
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

  const notes = (data || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));

  return res.status(200).json(notes);
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
      case 'find-context-cluster':
        return await handleFindContextCluster(req, res);
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
