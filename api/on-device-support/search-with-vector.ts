import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../server-lib/lib/supabaseClient';
export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end('Method Not Allowed');
    }

    const { q_emb, limit = 12 } = req.body || {};
    if (!Array.isArray(q_emb)) {
      return res.status(400).json({ error: 'q_emb required' });
    }

    const k = Number(limit);
    if (isNaN(k) || k <= 0 || k > 100) {
      return res.status(400).json({ error: 'Invalid limit. Must be a number between 1 and 100.' });
    }

    const { data, error } = await supabase.rpc('search_note_chunks', { q_emb, limit_k: k });
    if (error) {
      throw error;
    }

    return res.status(200).json(data || []);

  } catch (e: any) {
    console.error('[api/search-chunks] Error:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e.message });
  }
}