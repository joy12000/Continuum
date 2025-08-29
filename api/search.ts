// api/search.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

async function embedWithGoogle(text: string) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY not set');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const out = await model.embedContent({ content: text });
  return out.embedding.values as number[];
}

async function embedWithOpenAI(text: string) {
  const OpenAI = (await import('openai')).default;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const client = new OpenAI({ apiKey: key });
  const out = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
  return out.data[0].embedding as number[];
}

async function getEmbedding(text: string) {
  // Google 우선, 없으면 OpenAI
  if (process.env.GOOGLE_API_KEY) return embedWithGoogle(text);
  if (process.env.OPENAI_API_KEY) return embedWithOpenAI(text);
  throw new Error('No embedding key set (GOOGLE_API_KEY or OPENAI_API_KEY)');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).send('Method Not Allowed');
    }
    const qraw = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const q = (qraw || '').toString().trim();
    if (!q) return res.status(200).json([]);

    const q_emb = await getEmbedding(q);
    const limit_k = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 12;

    const { data, error } = await supabase.rpc('search_note_chunks', { q_emb, limit_k });
    if (error) return res.status(500).json({ error: '[supabase] ' + error.message });

    return res.status(200).json(data || []);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'search failed' });
  }
}
