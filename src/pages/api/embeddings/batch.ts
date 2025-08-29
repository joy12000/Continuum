import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(200).json([]);
  // 임베딩을 보관하는 테이블/뷰 이름을 맞춰주세요. 없으면 빈 배열 반환.
  const { data, error } = await supabaseAdmin.from("note_embeddings").select("id, embedding").in("id", ids);
  if (error) return res.status(200).json([]);
  return res.status(200).json(data || []);
}
