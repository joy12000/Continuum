// api/search.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

const EMPTY_PLACEHOLDER = 'empty-note';

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
    let q = (qraw || '').toString().trim();

    // 빈/1글자 쿼리는 [] 반환(500 금지)
    if (!q) return res.status(200).json([]);
    if (q.length < 2) q = EMPTY_PLACEHOLDER;

    // 선택적 uid: ?uid=... 또는 헤더 x-user-id
    const uidQ = Array.isArray(req.query.uid) ? req.query.uid[0] : req.query.uid;
    const uidHeader = (req.headers['x-user-id'] as string | undefined) || '';
    const uid = (uidQ || uidHeader || '').toString().trim();

    const q_emb = await getEmbedding(q);
    const limit_k = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 12;

    const args: any = { q_emb, limit_k };
    if (uid) args.uid = uid; // 함수가 uid를 받는 구조면 전달

    const { data, error } = await supabase.rpc('search_note_chunks', args);
    if (error) return res.status(500).json({ error: '[supabase] ' + error.message });
    return res.status(200).json(data || []);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'search failed' });
  }
}