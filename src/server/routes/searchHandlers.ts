// Removed VercelRequest/VercelResponse import for Next.js compatibility
import { TaskType } from '@google/generative-ai';
import { connectNewNote } from '../ai';
import { getEmbedding } from '../generativeai';
import { pickSupabase } from '../config';

export async function handleSearch(req: any, res: any) {
  try {
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

    // Apply Gemini Embedding 2 search task instruction
    const structuredQuery = `task: search result | query: ${q}`;
    const qEmb = await getEmbedding(structuredQuery);
    const limit_k = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 12;

    const args: any = {
      limit_k,
      q_emb: qEmb,
      uid: finalUid,
    };
    const { data, error } = await sb.rpc('search_chunks', args);

    if (error) return res.status(500).json({ error: `[supabase] ${error.message}` });
    
    // Ensure similarity is always present (fallback to distance calculation if needed)
    const results = (data || []).map((row: any) => ({
      ...row,
      similarity: typeof row.similarity === 'number' ? row.similarity : (1 - (row.distance ?? 0))
    }));

    return res.status(200).json(results);
  } catch (e: any) {
    const msg = e?.message || 'v1 failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[unknown] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

export async function handleCreateGeminiEmbedding(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { texts } = req.body;
    if (!texts || !Array.isArray(texts) || texts.some((t: any) => typeof t !== 'string')) {
      return res.status(400).json({ error: '`texts` field must be an array of strings.' });
    }

    const embeddings = await Promise.all(
      texts.map((text: string) => getEmbedding(text))
    );

    return res.status(200).json({ embeddings });
  } catch (e: any) {
    const msg = e?.message || 'Failed to create Gemini embedding';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[google] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

export async function handleGenerate(req: any, res: any) {
  try {
    const { input, context } = req.body;
    if (!input || !context) {
      return res.status(400).json({ error: 'input and context are required.' });
    }

    const result = await connectNewNote(input.query, context);
    return res.status(200).json({ data: { summary: result } });
  } catch (e: any) {
    const msg = e?.message || 'Generate handler failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[google] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}
