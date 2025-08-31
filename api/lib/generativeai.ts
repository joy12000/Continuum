import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;
function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}
function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("[config] Missing GEMINI_API_KEY/GOOGLE_API_KEY");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getEmbeddingModel() {
  const client = getClient();
  return client.getGenerativeModel({ model: "text-embedding-004" });
}

// 텍스트 임베딩 (빈 값 방어)
export async function getEmbedding(text: string, taskType: TaskType): Promise<number[]> {
  const model = getEmbeddingModel();
  const cleaned = (text ?? "").toString().trim() || "empty content for embedding";
  const result = await model.embedContent({
    content: { parts: [{ text: cleaned }], role: 'user' },
    taskType,
  });
  return result.embedding.values as number[];
}

export function getGenerativeModel() {
  const client = getClient();
  return client.getGenerativeModel({ model: "gemini-1.5-pro" });
}