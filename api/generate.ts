import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generativeModel } from './lib/generativeai';
import { trim, RagContext, RagInput, dailySummaryHandler, generateQuestionsHandler, ragHandler } from './generate/utils/rag';

export const config = { runtime: 'edge' };

// Consolidated handler logic
async function handleRag(input: RagInput, context: RagContext) {
  // ... (logic from api/generate/handlers/rag.ts)
  const prompt = `CONTEXT: ${context.map(c => trim(c.body, 200)).join('\n---\n')}\n\nQUERY: ${input.query}\n\nANSWER IN MARKDOWN:`;
  const result = await generativeModel.generateContentStream(prompt);
  return result.stream;
}

async function handleDailySummary(date: string) {
  // ... (logic from api/generate/handlers/dailySummary.ts)
  // This is a placeholder, actual implementation would fetch notes for the date
  const prompt = `Summarize the activities for ${date}.`;
  const result = await generativeModel.generateContentStream(prompt);
  return result.stream;
}

async function handleGenerateQuestions(text: string) {
  // ... (logic from api/generate/handlers/generateQuestions.ts)
  const prompt = `Generate 3 insightful questions based on the following text:\n\n${trim(text, 1000)}`;
  const result = await generativeModel.generateContentStream(prompt);
  return result.stream;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { type, ...payload } = req.body;

    let stream;
    switch (type) {
      case 'rag':
        stream = await handleRag(payload.input, payload.context);
        break;
      case 'dailySummary':
        stream = await handleDailySummary(payload.date);
        break;
      case 'generateQuestions':
        stream = await handleGenerateQuestions(payload.text);
        break;
      default:
        return res.status(400).json({ error: `Unknown generation type: ${type}` });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    for await (const chunk of stream) {
      res.write(chunk.text());
    }
    res.end();

  } catch (e: any) {
    console.error('[api/generate] Error:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e.message });
  }
}
