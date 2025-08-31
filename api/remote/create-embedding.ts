// api/embeddings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

async function embedWithGoogle(texts: string[]) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY not set');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  const response = await model.batchEmbedContents({
    requests: texts.map(t => ({ content: t }))
  });
  
  return response.embeddings.map(e => e.values);
}

async function embedWithOpenAI(texts: string[]) {
  const OpenAI = (await import('openai')).default;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const client = new OpenAI({ apiKey: key });
  const out = await client.embeddings.create({ model: 'text-embedding-3-small', input: texts });
  return out.data.map(d => d.embedding);
}

async function getEmbeddings(texts: string[]) {
  if (process.env.GOOGLE_API_KEY) return embedWithGoogle(texts);
  if (process.env.OPENAI_API_KEY) return embedWithOpenAI(texts);
  throw new Error('No embedding key set (GOOGLE_API_KEY or OPENAI_API_KEY)');
}

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
    } else if (req.method === 'GET') {
      const q = req.query || {};
      const raw = (Array.isArray(q.text) ? q.text[0] : q.text) as string | undefined;
      if (raw) {
        texts = [raw];
      }
    } else {
      res.setHeader('Allow', 'POST, GET');
      return res.status(405).send('Method Not Allowed');
    }

    const validTexts = texts.map(t => (t || '').trim()).filter(t => t.length >= 2);
    if (validTexts.length === 0) {
      return res.status(200).json({ embeddings: [] });
    }

    const embeddings = await getEmbeddings(validTexts);
    
    return res.status(200).json({ embeddings: embeddings });

  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'embedding failed' });
  }
}