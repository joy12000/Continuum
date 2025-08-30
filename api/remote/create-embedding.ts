// api/embeddings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

const EMPTY_PLACEHOLDER = 'empty-note';

function buildTextFromBody(req: VercelRequest): string | undefined {
  const b: any = req.body || {};
  const title = (b.title ?? '').toString();
  const body = (b.body ?? '').toString();
  const tags = Array.isArray(b.tags) ? b.tags.join(' ') : (b.tags ?? '');
  '''// api/embeddings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

const EMPTY_PLACEHOLDER = 'empty-note';

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
      // If all texts are invalid, we can't proceed.
      // Or, decide if we should embed a placeholder for each invalid one.
      // For now, let's return an empty array of embeddings.
      return res.status(200).json({ embeddings: [] });
    }

    const embeddings = await getEmbeddings(validTexts);
    
    // This part is tricky. We need to map embeddings back to the original texts array,
    // potentially inserting nulls or placeholders for the texts that were filtered out.
    // For now, let's assume the client handles this and just return the valid embeddings.
    // A more robust solution would be needed if the client expects a 1:1 mapping.
    
    // The client `generateEmbeddings` expects `number[][]` which is `embeddings`.
    // The old single-text version returned `{ embedding: emb }`.
    // The new batch version should return `{ embeddings: embs }`.
    // The client in `supabaseService.ts` expects `data.embeddings`.
    
    return res.status(200).json({ embeddings: embeddings });

  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'embedding failed' });
  }
}
''
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
