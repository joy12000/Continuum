import { GoogleGenerativeAI, ModelParams } from '@google/generative-ai';

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