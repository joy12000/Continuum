import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './auth.js';
import { getUserFileSearchStoreName } from './fileSearch.js';

export async function withFileSearchContext(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return null;

  const storeName = getUserFileSearchStoreName(auth.userId);

  return {
    ...auth,
    storeName,
  };
}
