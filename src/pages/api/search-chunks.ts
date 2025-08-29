import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { q_emb, limit = 12 } = req.body || {};
  if (!Array.isArray(q_emb)) return res.status(400).json({ error: "q_emb required" });
  const { data, error } = await supabaseAdmin.rpc("search_note_chunks", {
    q_emb,
    limit_k: Number(limit),
  });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
