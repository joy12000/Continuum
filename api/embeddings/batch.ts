import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabaseClient';
export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'Invalid request: "ids" must be a non-empty array.' });
    }

    const { data, error } = await supabase
      .from('note_embeddings')
      .select('id, embedding')
      .in('id', ids);

    if (error) {
      // 오류를 발생시켜 아래 catch 블록에서 처리하도록 합니다.
      throw error;
    }

    return res.status(200).json(data || []);

  } catch (e: any) {
    // Vercel 함수 로그에 상세한 오류를 기록합니다.
    console.error('[api/embeddings/batch] Error:', e);

    // 클라이언트에게는 일반적인 500 오류를 반환합니다.
    return res.status(500).json({ error: 'Internal Server Error', details: e.message });
  }
}