import type { NextApiRequest, NextApiResponse } from "next";
// TODO: 이 경로를 실제 임베딩 함수로 교체하세요.
// 예: import { buildEmbedding } from "@/lib/embeddings/openai";
import { buildEmbedding } from "@/server/embeddings/provider";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "text required" });
  try {
    const embedding = await buildEmbedding(text);
    return res.status(200).json({ embedding });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "embedding failed" });
  }
}
