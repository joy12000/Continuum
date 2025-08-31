// server-lib/lib/embedding.ts
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

async function embedWithGoogle(texts: string[], taskType: TaskType) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY not set');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  // Handle single text case for convenience
  if (texts.length === 1) {
    const res = await model.embedContent({ 
      content: { parts: [{ text: texts[0] }] },
      taskType: taskType
    });
    return [res.embedding.values];
  }

  // Handle batch case
  const response = await model.batchEmbedContents({
    requests: texts.map(t => ({ 
      content: { parts: [{ text: t }] },
      taskType: taskType
    }))
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

export async function getEmbeddings(texts: string[], type: 'query' | 'document') {
  const validTexts = texts.map(t => (t || '').trim()).filter(t => t.length >= 2);
  if (validTexts.length === 0) {
    return [];
  }

  if (process.env.GOOGLE_API_KEY) {
    const taskType = type === 'query' ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT;
    return embedWithGoogle(validTexts, taskType);
  }
  if (process.env.OPENAI_API_KEY) {
    return embedWithOpenAI(validTexts);
  }
  throw new Error('No embedding key set (GOOGLE_API_KEY or OPENAI_API_KEY)');
}
