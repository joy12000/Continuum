
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing in .env.local");
    return;
  }

  console.log("Using API Key:", apiKey.substring(0, 5) + "...");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

  try {
    const result = await model.generateContent("Hello, are you there?");
    const response = await result.response;
    console.log("Response:", response.text());
  } catch (error) {
    console.error("Gemini Test Failed:", error);
  }
}

testGemini();
