import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGenerativeModel } from '../lib/generativeai';
export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Request body must contain a non-empty \'text\' field.' });
    }

    const model = getGenerativeModel('text-embedding-004');
    const out = await model.embedContent(text);
    
    return res.status(200).json({ embedding: out.embedding.values });

  } catch (e: any) {
    console.error('[api/embeddings/query] Error:', e);
    return res.status(500).json({ error: e?.message || 'Embedding failed' });
  }
}