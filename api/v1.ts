import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TaskType } from '@google/generative-ai';

// Base imports
import { getEmbedding, getGenerativeModel } from './shared-lib/generativeai.js';
import { requireUser } from './shared-lib/auth.js';
import { getSupabaseClient } from './shared-lib/supabaseClient.js';
import type { InsightThread, Note, NoteChunk, NoteLink, PreparedNote } from './shared-lib/types.js';
import { getInsightThreadsCache, upsertInsightThreadsCache } from './shared-lib/database.js';
import { summarizeThread } from './shared-lib/ai.js';
import {
  prepareNotes,
  buildCitationSet,
  buildEdges,
  cluster,                 // legacy
  clusterLPA,              // lpa
  clusterByAutoThreshold,  // auto
  clusterHybrid,           // hybrid (fallback)
  clusterScore,
  pairScore
} from './shared-lib/compute.js';

export const config = { runtime: 'nodejs' };

// --- HELPER FUNCTIONS ---

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

async function runThreadGeneration(jobId: string, userId: string, token: string) {
  const supabase = getSupabaseClient(token);
  const updateJobStatus = async (status: string) => {
    const { error } = await supabase.from('thread_generation_jobs').update({ status, updated_at: new Date().toISOString() }).eq('id', jobId);
    if (error) console.error(`Failed to update job ${jobId} status to ${status}:`, error);
  };

  try {
    await updateJobStatus('processing');
    const { data: notes, error: nerr } = await supabase.from("notes").select("id,title,body,tags,created_at,updated_at").order("created_at", { ascending: true }).limit(MAX_NOTES);
    if (nerr) throw new Error(`Failed to fetch notes: ${nerr.message}`);
    const noteIds = (notes ?? []).map((n: any) => n.id);
    if (!noteIds.length) {
      await upsertInsightThreadsCache(supabase, userId, []);
      await updateJobStatus('completed');
      return;
    }
    const { data: chunks, error: cerr } = await supabase.from("note_chunks").select("note_id,embedding").in("note_id", noteIds);
    if (cerr) throw new Error(`Failed to fetch chunk embeddings: ${cerr.message}`);
    const { data: links, error: lerr } = await supabase.from("note_links").select("from_note_id,to_note_id").in("from_note_id", noteIds).in("to_note_id", noteIds);
    if (lerr) throw new Error(`Failed to fetch links: ${lerr.message}`);
    const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);
    const citationSet = buildCitationSet((links as NoteLink[]) ?? []);
    const weights = { citation: 0.0, sim: 1.0, tag: 0.0 }; // Set citation and tag weights to 0 as they are not fully implemented
    const edges = buildEdges(prepared, citationSet, weights);
    // === Cluster method selection (env-driven) =======================
    // Vercel 환경변수에서 선택: hybrid | legacy | lpa | auto
    const CLUSTER_METHOD = process.env.CONTINUUM_CLUSTER_METHOD ?? "hybrid";
    const method = String(CLUSTER_METHOD);

    let clusters: number[][];

    try {
      if (method === "legacy") {
        // 기존 임계값 기반(너의 cluster 함수)
        clusters = cluster(prepared, edges).clusters;
      } else if (method === "lpa") {
        // 파라미터프리 라벨 전파 (임계값 없음)
        clusters = clusterLPA(prepared, edges, {
          minEdge: 0.05,        // 너무 약한 간선 컷
          minClusterSize: 2     // 작은 군집 흡수
        }).clusters;
      } else if (method === "auto") {
        // 원하는 개수 범위를 맞추는 자동 임계값 + 모듈러리티 최적
        clusters = clusterByAutoThreshold(prepared, edges, {
          kMin: 3,
          kMax: 12
        }).clusters;
      } else {
        // 기본은 하이브리드: LPA 1차 → 범위 벗어나면 auto로 보정
        clusters = clusterHybrid(prepared, edges, {
          kMin: 3, kMax: 12,
          minEdge: 0.05,
          minClusterSize: 2,
          knnK: Number(process.env.CONTINUUM_CLUSTER_K ?? 8),   // 선택
          mutual: (process.env.CONTINUUM_CLUSTER_MUTUAL ?? "1") === "1"
        }).clusters;
      }
    } catch (e) {
      // 안전장치: 문제가 나면 레거시로 폴백
      clusters = cluster(prepared, edges).clusters;
    }
    // === /Cluster method selection ===========================
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
      const rawScore = clusterScore(idxs, edges);
      const safeScore = Number.isFinite(rawScore) ? rawScore : 0;
      out.push({ 
        id: idxs.map((i) => prepared[i].note.id).join("_"), 
        title, 
        summary, 
        note_ids: idxs.map((i) => prepared[i].note.id),
        notes: groupNotes, 
        size: idxs.length, 
        score: safeScore, // ← 항상 숫자
      });
    }
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
    const finalUid = uid === '' ? null : uid; // Convert empty string to null

    if (!finalUid) { // Check for null
      return res.status(400).json({ error: 'User ID is required for search.' });
    }

    const sb = pickSupabase(req);
    if (!sb) return res.status(401).json({ error: 'Authentication required.' });
    const qEmb = await getEmbedding(q, TaskType.RETRIEVAL_QUERY);
    const limit_k = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 12;

    const args: any = {
      limit_k: limit_k,
      q_emb: qEmb,
      uid: finalUid // Pass finalUid
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

  function sanitizeThread(t: any) {
    const score = Number.isFinite(t?.score) ? Number(t.score) : 0;
    const size  = Number.isFinite(t?.size)  ? Number(t.size)  : Array.isArray(t?.note_ids) ? t.note_ids.length : 0;
    return { ...t, score, size };
  }

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
    const { data: job, error: jobError } = await supabase.from('thread_generation_jobs').insert({ user_id: userId, status: 'pending' }).select().single();
    if (jobError || !job) {
      return res.status(500).json({ message: 'Failed to create generation job', detail: jobError?.message });
    }
    runThreadGeneration(job.id, userId, token).catch(console.error);
    return res.status(202).json({ jobId: job.id });
  } else if (req.method === "GET") {
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'jobId query parameter is required' });
    }
    const { data, error } = await supabase.from('thread_generation_jobs').select('status').eq('id', jobId).eq('user_id', userId).single();
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

async function handleGetBacklinks(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
  const noteId = req.query.noteId as string;
  if (!noteId) {
    return res.status(400).json({ error: "Missing noteId" });
  }
  const { data, error } = await supabase.from("note_links").select("from_note_id,to_note_id,notes!note_links_from_note_id_fkey(id,title)").eq("to_note_id", noteId);
  if (error) {
    return res.status(500).json({ error: "Failed to fetch backlinks", detail: error.message });
  }
  const backlinks = (data ?? []).map((row: any) => ({ from_note_id: row.from_note_id, to_note_id: row.to_note_id, title: row.notes?.[0]?.title ?? null }));
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
  const citation_weight = Number(req.query.citation_weight ?? 1.0) || 1.0;
  const sim_weight = Number(req.query.sim_weight ?? 0.6) || 0.6;
  const tag_weight = Number(req.query.tag_weight ?? 0.2) || 0.2;
  const { data: notes, error: nerr } = await supabase.from("notes").select("id,title,body,tags,created_at,updated_at");
  if (nerr) {
    return res.status(500).json({ error: "Failed to fetch notes", detail: nerr.message });
  }
  const ids = (notes as Note[] ?? []).map((n: Note) => n.id);
  if (!ids.includes(noteId)) {
    return res.status(404).json({ error: "Note not found" });
  }
  const { data: chunks, error: cerr } = await supabase.from("note_chunks").select("note_id,embedding").in("note_id", ids);
  if (cerr) {
    return res.status(500).json({ error: "Failed to fetch chunk embeddings", detail: cerr.message });
  }
  const { data: links, error: lerr } = await supabase.from("note_links").select("from_note_id,to_note_id").in("from_note_id", ids).in("to_note_id", ids);
  if (lerr) {
    return res.status(500).json({ error: "Failed to fetch links", detail: lerr.message });
  }
  const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);
  const idx = prepared.findIndex((p: PreparedNote) => p.note.id === noteId);
  const target = prepared[idx];
  const citationSet = buildCitationSet((links as NoteLink[]) ?? []);
  const results = prepared.filter((_: PreparedNote, i: number) => i !== idx).map((p: PreparedNote) => ({ note_id: p.note.id, title: p.note.title, score: pairScore(target, p, citationSet, { citation: citation_weight, sim: sim_weight, tag: tag_weight }) })).sort((a: { score: number }, b: { score: number }) => b.score - a.score).slice(0, 50);
  return res.status(200).json({ note_id: noteId, connections: results });
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
      case 'get-note':
        return await handleGetNote(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e: any) {
    const msg = e?.message || 'API handler failed';
    return res.status(500).json({ error: msg });
  }
}