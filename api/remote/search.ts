// api/remote/search.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../server-lib/lib/supabaseClient';
import { getEmbeddings } from '../../server-lib/lib/embedding';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).send('Method Not Allowed');
    }
    const qraw = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const q = (qraw || '').toString().trim();

    if (!q) return res.status(200).json([]);

    // 선택적 uid: ?uid=... 또는 헤더 x-user-id
    const uidQ = Array.isArray(req.query.uid) ? req.query.uid[0] : req.query.uid;
    const uidHeader = (req.headers['x-user-id'] as string | undefined) || '';
    const uid = (uidQ || uidHeader || '').toString().trim();

    const embeddings = await getEmbeddings([q], 'query');
    if (embeddings.length === 0) {
        // This can happen if the query was too short and got filtered out.
        return res.status(200).json([]);
    }
    const q_emb = embeddings[0];

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