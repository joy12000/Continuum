import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
export const config = { runtime: 'nodejs' };
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const out = await model.embedContent({ content: text });
    return res.status(200).json({ embedding: out.embedding.values });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'embedding failed' });
  }
}
