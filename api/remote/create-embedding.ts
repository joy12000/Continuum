// api/embeddings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

const EMPTY_PLACEHOLDER = 'empty-note';

function buildTextFromBody(req: VercelRequest): string | undefined {
  const b: any = req.body || {};
  const title = (b.title ?? '').toString();
  const body = (b.body ?? '').toString();
  const tags = Array.isArray(b.tags) ? b.tags.join(' ') : (b.tags ?? '');
  // text, title, body, tags 중 있는 것만 합치고 트림
  const txt = [b.text, title, body, tags].filter(Boolean).join('\n').trim();
  return txt || undefined;
}

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
async function getEmbedding(text: string) {
  if (process.env.GOOGLE_API_KEY) return embedWithGoogle(text);
  if (process.env.OPENAI_API_KEY) return embedWithOpenAI(text);
  throw new Error('No embedding key set (GOOGLE_API_KEY or OPENAI_API_KEY)');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let text: string | undefined;
    if (req.method === 'POST') {
      text = buildTextFromBody(req);
    } else if (req.method === 'GET') {
      const q = req.query || {};
      const raw = (Array.isArray(q.text) ? q.text[0] : q.text) as string | undefined;
      text = (raw ?? '').toString().trim() || undefined;
    } else {
      res.setHeader('Allow', 'POST, GET');
      return res.status(405).send('Method Not Allowed');
    }
    // 빈/짧은 입력은 placeholder로 대체
    if (!text || text.length < 2) text = EMPTY_PLACEHOLDER;

    const emb = await getEmbedding(text);
    return res.status(200).json({ embedding: emb });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'embedding failed' });
  }
}
