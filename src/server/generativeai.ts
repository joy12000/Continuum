import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

function getEnv(key: string, defaultValue: string = "") {
  const v = process.env[key];
  if (!v) {
    console.warn(`Warning: Environment variable ${key} is not set.`);
    return defaultValue;
  }
  return v;
}

const defaultApiKey = getEnv("GEMINI_API_KEY");
const threadsApiKey = process.env.GEMINI_API_KEY_THREADS || defaultApiKey;

let defaultGenAI: GoogleGenerativeAI | null = null;
let threadsGenAI: GoogleGenerativeAI | null = null;

if (defaultApiKey) {
  defaultGenAI = new GoogleGenerativeAI(defaultApiKey);
}
if (threadsApiKey) {
  threadsGenAI = new GoogleGenerativeAI(threadsApiKey);
}

const defaultModelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const threadsModelName = process.env.GEMINI_MODEL_THREADS || defaultModelName;

export function getGenerativeModel(purpose: 'default' | 'thread' = 'default') {
    const genAI = purpose === 'thread' ? threadsGenAI : defaultGenAI;
    const modelName = purpose === 'thread' ? threadsModelName : defaultModelName;
    
    if (!genAI) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    return genAI.getGenerativeModel({ model: modelName });
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (!defaultGenAI) {
    throw new Error("GEMINI_API_KEY is not configured for embeddings.");
  }
  const embeddingModel = defaultGenAI.getGenerativeModel({ model: "gemini-embedding-2" });
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  } as any);
  return result.embedding.values;
}
