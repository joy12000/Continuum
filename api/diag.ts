// api/diag.ts
// 보안: 헤더 x-diag-token 이 환경변수 DIAG_TOKEN 과 일치할 때만 동작
import type { VercelRequest, VercelResponse } from '@vercel/node';
export const config = { runtime: 'nodejs' };
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.headers['x-diag-token'];
  if (!process.env.DIAG_TOKEN || token !== process.env.DIAG_TOKEN) {
    return res.status(404).send('Not found');
  }
  return res.status(200).json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasGoogleKey: !!process.env.GOOGLE_API_KEY,
    hasOpenaiKey: !!process.env.OPENAI_API_KEY,
    nodeEnv: process.env.NODE_ENV || 'unknown'
  });
}
