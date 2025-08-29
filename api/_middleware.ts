
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ApiError } from './lib/errors';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export default async function middleware(req: VercelRequest, res: VercelResponse, next: (err?: any) => void) {
  try {
    const apiKey = process.env.API_SECRET_KEY;
    if (!apiKey) {
      throw new ApiError('API secret key not configured.', 500);
    }

    const providedApiKey = req.headers.authorization?.split(' ')[1];
    if (providedApiKey !== apiKey) {
      throw new ApiError('Unauthorized.', 401);
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const { success, limit, remaining, reset } = await ratelimit.limit(ip as string);

    if (!success) {
      res.setHeader('X-Ratelimit-Limit', limit.toString());
      res.setHeader('X-Ratelimit-Remaining', remaining.toString());
      res.setHeader('X-Ratelimit-Reset', reset.toString());
      throw new ApiError('Too many requests.', 429);
    }

    next();
  } catch (e: any) {
    console.error(`[middleware] error:`, e);
    const error = e instanceof ApiError ? e : new ApiError(e.message);
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
}
