// PATCH: Dedicated embeddings API to avoid editing existing generate.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  try {
    const { texts } = req.body ?? {};
    if (!Array.isArray(texts) || texts.length === 0) {
      res.status(400).json({ error: "texts array is required" });
      return;
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Missing GEMINI_API_KEY" });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "embedding-001" });

    const result = await model.batchEmbedContents({
      requests: texts.map((text: string) => ({        content: { parts: [{ text }] },      })),
    });

    const embeddings = (result as any).embeddings?.map((e: any) => e.values) ?? [];
    res.status(200).json({ embeddings });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
