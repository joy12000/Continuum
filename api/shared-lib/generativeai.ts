import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

function requireEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required.`);
  return v;
}

const genAI = new GoogleGenerativeAI(requireEnv("GOOGLE_API_KEY"));
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
const generativeModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash-latest" });

export function getGenerativeModel() {
    return generativeModel;
}

export async function getEmbedding(text: string, task: TaskType = TaskType.RETRIEVAL_DOCUMENT): Promise<number[]> {
    const result = await embeddingModel.embedContent({
        content: { parts: [{ text }] },
        taskType: task,
    });
    return result.embedding.values;
}
