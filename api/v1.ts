

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TaskType } from '@google/generative-ai';

// Original imports from v1.ts
import { getEmbedding, getGenerativeModel } from './lib/generativeai.js';
import { trimContext as trim } from './generate-utils/trim.js';

// Imports from generate.ts (paths adjusted from ../../../ to ../)
import { requireUser } from '../lib/auth.js';
import type { InsightThread, Note, NoteChunk, NoteLink } from '../lib/types.js';
import { prepareNotes, buildCitationSet, buildEdges, cluster, clusterScore } from '../lib/compute.js';
import { summarizeThread } from '../lib/ai.js';
import { upsertInsightThreadsCache } from '../lib/database.js';
import { getSupabaseClient } from '../lib/supabaseClient.js';


export const config = { runtime: 'nodejs' };

// --- Helper from generate.ts ---
const MAX_NOTES = parseInt(process.env.CONTINUUM_MAX_NOTES || "400", 10);

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
      .select("id,title,content,tags,created_at,updated_at")
      .order("created_at", { ascending: true })
      .limit(MAX_NOTES);
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
    const edges = buildEdges(prepared, citationSet, { citation: 0.5, sim: 1.0, tag: 0.25 });
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

    await upsertInsightThreadsCache(supabase, userId, out);
    await updateJobStatus('completed');

  } catch (error: any) {
    console.error(`runThreadGeneration failed for job ${jobId}:`, error);
    await updateJobStatus('failed');
  }
}


// --- Original v1.ts helpers ---
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

// --- Handlers for different actions ---

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

    const sb = pickSupabase(req);
    if (!sb) return res.status(401).json({ error: 'Authentication required.' });
    const qEmb = await getEmbedding(q, TaskType.RETRIEVAL_QUERY);
    const limit_k = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 12;

    const args: any = {
      q_emb: qEmb,
      limit_k: limit_k,
      uid: uid || undefined
    };
    const { data, error } = await sb.rpc('search_note_embeddings', args);

    if (error) return res.status(500).json({ error: `[supabase] ${error.message}` });
    return res.status(200).json(data || []);
  } catch (e: any) {
    const msg = e?.message || 'v1 failed';
    const tag = /^[\\\\\[(supabase|google|openai|config)\\\\].*?/.test(msg) ? '' : '[unknown] ';
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
    const tag = /^[\\\\\[(supabase|google|openai|config)\\\\].*?/.test(msg) ? '' : '[google] ';
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
    const prompt = `Based on the following context, write a brief summary of the main text provided below.\n\nContext:\n${JSON.stringify(context)}\n\nMain Text to Summarize:\n${input.query}\n\nSummary:`
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });

  } catch (e: any) {
    const msg = e?.message || 'Generate handler failed';
    const tag = /^[\\\\\[(supabase|google|openai|config)\\\\].*?/.test(msg) ? '' : '[google] ';
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
    const tag = /^[\\\\\[(supabase|google|openai|config)\\\\].*?/.test(msg) ? '' : '[supabase] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
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


// --- Main Router ---
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
      case 'generate-thread':
        return await handleGenerateThread(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'API handler failed' });
  }
}
