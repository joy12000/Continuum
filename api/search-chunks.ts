import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { q_emb, limit = 12 } = req.body || {};
  if (!Array.isArray(q_emb)) return res.status(400).json({ error: 'q_emb required' });
  const { data, error } = await supabase.rpc('search_note_chunks', { q_emb, limit_k: Number(limit) });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data || []);
}
