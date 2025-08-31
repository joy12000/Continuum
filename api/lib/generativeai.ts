
import { GoogleGenerativeAI, ModelParams, TaskType } from '@google/generative-ai';

// Cache the client instance
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getGenerativeModel(params?: Omit<ModelParams, 'model'> & { model?: string }) {
  const client = getClient();
  const modelName = params?.model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
  
  return client.getGenerativeModel({ ...params, model: modelName });
}

// New function to get the embedding model
export function getEmbeddingModel() {
  const client = getClient();
  return client.getGenerativeModel({ model: "text-embedding-004" });
}

// New function to get a single embedding
export async function getEmbedding(text: string, taskType: TaskType): Promise<number[]> {
  const model = getEmbeddingModel();
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    taskType: taskType
  });
  return result.embedding.values;
}
