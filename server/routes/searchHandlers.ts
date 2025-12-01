import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TaskType } from '@google/generative-ai';
import { connectNewNote } from '../ai.js';
import { requireUser } from '../auth.js';
import { searchFileSearchStore } from '../fileSearch.js';
import { getEmbedding } from '../generativeai.js';

export async function handleSearch(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireUser(req, res);
    if (!auth) return;

    const rawQ = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const q = (rawQ ?? '').toString().trim();
    if (!q) return res.status(200).json({ results: [] });

    const limit_k = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 12;

    const search = await searchFileSearchStore({ query: q, userId: auth.userId, limit: limit_k });

    const { results = [], groundingMetadata } = search || {};
    const normalizedResults = results.map((item, idx) => ({
      document_id: item.uri || item.fileName || item.noteId || item.chunkId || `result-${idx}`,
      note_id: item.noteId ?? null,
      chunk_index: item.chunkId ? Number(item.chunkId) || idx : idx,
      content: item.content,
      similarity: item.score ?? null,
      score: item.score ?? null,
      uri: item.uri,
      fileName: item.fileName,
    }));

    return res.status(200).json({ results: normalizedResults, groundingMetadata });
  } catch (e: any) {
    const msg = e?.message || 'v1 failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[unknown] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

export async function handleCreateGeminiEmbedding(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { texts } = req.body;
    if (!texts || !Array.isArray(texts) || texts.some((t) => typeof t !== 'string')) {
      return res.status(400).json({ error: '`texts` field must be an array of strings.' });
    }

    const embeddings = await Promise.all(texts.map((text) => getEmbedding(text, TaskType.RETRIEVAL_DOCUMENT)));

    return res.status(200).json({ embeddings });
  } catch (e: any) {
    const msg = e?.message || 'Failed to create Gemini embedding';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[google] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

export async function handleGenerate(req: VercelRequest, res: VercelResponse) {
  try {
    const { input, context } = req.body;
    if (!input || !context) {
      return res.status(400).json({ error: 'input and context are required.' });
    }

    const result = await connectNewNote(input.query, context);
    return res.status(200).json({ data: result });
  } catch (e: any) {
    const msg = e?.message || 'Generate handler failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[google] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}
