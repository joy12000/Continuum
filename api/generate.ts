import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDailySummary } from './generate/handlers/dailySummary';
import { handleGenerateQuestions } from './generate/handlers/generateQuestions';
import { handleRag } from './generate/handlers/rag';
import { ApiError } from './lib/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') {
      throw new ApiError('Method Not Allowed', 405);
    }

    const payload = req.body ?? {};
    const type = payload.type || 'rag';

    let responseData;
    switch (type) {
      case 'daily_summary':
        responseData = await handleDailySummary(payload);
        break;
      case 'generate_questions':
        responseData = await handleGenerateQuestions(payload);
        break;
      default:
        responseData = await handleRag(payload);
        break;
    }
    return res.status(200).json(responseData);
  } catch (e: any) {
    console.error(`[handler:${e.type || 'unknown'}] error:`, e);
    const error = e instanceof ApiError ? e : new ApiError(e.message);
    return res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
}