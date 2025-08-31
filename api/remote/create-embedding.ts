// api/remote/create-embedding.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEmbeddings } from '../lib/embedding';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let texts: string[] = [];
    if (req.method === 'POST') {
      const body = req.body || {};
      if (Array.isArray(body.texts)) {
        texts = body.texts;
      } else if (typeof body.text === 'string') {
        texts = [body.text];
      }
    } else {
      res.setHeader('Allow', 'POST');
      return res.status(405).send('Method Not Allowed');
    }

    const embeddings = await getEmbeddings(texts, 'document');
    
    return res.status(200).json({ embeddings: embeddings });

  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'embedding failed' });
  }
}
