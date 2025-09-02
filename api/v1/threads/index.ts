import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../../lib/auth.js";
import { getInsightThreadsCache } from "../../../lib/database.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;

  const { threads, lastUpdatedAt } = await getInsightThreadsCache(supabase, userId);
  res.status(200).json({ threads, lastUpdatedAt });
}
