// api/embeddings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
export const config = { runtime: 'nodejs' };

async function embedWithGoogle(text: string) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY not set');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const out = await model.embedContent({ content: text });
  return out.embedding.values as number[];
}

async function embedWithOpenAI(text: string) {
  const OpenAI = (await import('openai')).default;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const client = new OpenAI({ apiKey: key });
  const out = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
  return out.data[0].embedding as number[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let text: string | undefined;
    if (req.method === 'POST') {
      text = (req.body && (req.body as any).text) || undefined;
    } else if (req.method === 'GET') {
      const q = req.query || {};
      text = (Array.isArray(q.text) ? q.text[0] : q.text) as string | undefined;
    } else {
      res.setHeader('Allow', 'POST, GET');
      return res.status(405).send('Method Not Allowed');
    }
    if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });

    if (!process.env.GOOGLE_API_KEY && !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'No embedding key set (GOOGLE_API_KEY or OPENAI_API_KEY)' });
    }

    let emb: number[];
    if (process.env.GOOGLE_API_KEY) {
      emb = await embedWithGoogle(text);
    } else {
      emb = await embedWithOpenAI(text);
    }
    return res.status(200).json({ embedding: emb });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'embedding failed' });
  }
}
