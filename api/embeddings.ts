// api/embeddings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).send('Method Not Allowed');
    }

    const { texts } = req.body as { texts?: string[] };

    if (!texts || !Array.isArray(texts) || texts.some(t => typeof t !== 'string' || !t.trim())) {
      return res.status(400).json({ error: 'Request body must be an object with a non-empty array of non-empty strings in the \'texts\' field.' });
    }

    if (texts.length > 100) {
      return res.status(400).json({ error: 'Too many texts. Maximum 100 texts per request.' });
    }

    for (const text of texts) {
      if (text.length < 2) {
        return res.status(400).json({ error: 'Text too short. Minimum 2 characters per text.' });
      }
      if (text.length > 8192) {
        return res.status(400).json({ error: 'Text too long. Maximum 8192 characters per text.' });
      }
    }

    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'GOOGLE_API_KEY not set' });
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const embeddings: number[][] = [];
    for (const text of texts) {
      try {
        const out = await model.embedContent(text);
        embeddings.push(out.embedding.values);
      } catch (e: any) {
        console.error(`Failed to embed text: "${text}"`, e);
        embeddings.push(Array(768).fill(0)); // 임베딩 실패 시 0으로 채워진 배열 반환
      }
    }

    return res.status(200).json({ embeddings });

  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Embedding failed' });
  }
}

