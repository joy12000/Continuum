import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
export const config = { runtime: 'nodejs' };
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } });
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(200).json([]);
  const { data, error } = await supabase.from('note_embeddings').select('id, embedding').in('id', ids);
  if (error) return res.status(200).json([]);
  return res.status(200).json(data || []);
}
