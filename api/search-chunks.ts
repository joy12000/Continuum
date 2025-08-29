import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabaseClient';
export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { q_emb, limit = 12 } = req.body || {};
  if (!Array.isArray(q_emb)) return res.status(400).json({ error: 'q_emb required' });
  const k = Number(limit);
  if (isNaN(k) || k <= 0 || k > 100) {
    return res.status(400).json({ error: 'Invalid limit. Must be a number between 1 and 100.' });
  }
  const { data, error } = await supabase.rpc('search_note_chunks', { q_emb, limit_k: k });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data || []);
}

