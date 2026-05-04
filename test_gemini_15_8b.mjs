
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGemini15_8b() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

  try {
    const result = await model.generateContent("Hello");
    console.log("Success:", (await result.response).text());
  } catch (error) {
    console.error("Failed:", error.message);
  }
}

testGemini15_8b();
