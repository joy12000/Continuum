// api/embeddings.ts
// Vercel Serverless: POST/GET 모두 허용해 405 방지
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let text: string | undefined;
    if (req.method === 'POST') {
      text = (req.body && (req.body as any).text) || undefined;
    } else if (req.method === 'GET') {
      const q = req.query || {};
      text = (Array.isArray(q.text) ? q.text[0] : q.text) as string | undefined;
    } else {
      // 다른 메서드는 405
      res.setHeader('Allow', 'POST, GET');
      return res.status(405).send('Method Not Allowed');
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text required' });
    }

    const key = process.env.GOOGLE_API_KEY;
    if (!key) return res.status(500).json({ error: 'GOOGLE_API_KEY not set' });

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const out = await model.embedContent({ content: text });
    return res.status(200).json({ embedding: out.embedding.values });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'embedding failed' });
  }
}
