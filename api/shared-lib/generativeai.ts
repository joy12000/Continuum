import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

function requireEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required.`);
  return v;
}

const defaultApiKey = requireEnv("GEMINI_API_KEY");
const threadsApiKey = process.env.GEMINI_API_KEY_THREADS || defaultApiKey;

const defaultGenAI = new GoogleGenerativeAI(defaultApiKey);
const threadsGenAI = new GoogleGenerativeAI(threadsApiKey);

const embeddingModel = defaultGenAI.getGenerativeModel({ model: "gemini-embedding-001" });

const defaultModelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const threadsModelName = process.env.GEMINI_MODEL_THREADS || defaultModelName;

const defaultGenerativeModel = defaultGenAI.getGenerativeModel({ model: defaultModelName });
const threadsGenerativeModel = threadsGenAI.getGenerativeModel({ model: threadsModelName });

export function getGenerativeModel(purpose: 'default' | 'thread' = 'default') {
    if (purpose === 'thread') {
        return threadsGenerativeModel;
    }
    return defaultGenerativeModel;
}

export async function getEmbedding(text: string, task: TaskType = TaskType.RETRIEVAL_DOCUMENT): Promise<number[]> {
    const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType: task,
        outputDimensionality: 768,
    });
    return result.embedding.values;
}
