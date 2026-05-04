
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing in .env.local");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // Note: The SDK might not have a direct listModels method in all versions, 
    // but we can try to use a known working model.
    console.log("Testing with gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hi");
    console.log("gemini-1.5-flash works!");
    
    console.log("Testing with gemini-1.5-flash-8b...");
    const model8b = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result8b = await model8b.generateContent("Hi");
    console.log("gemini-1.5-flash-8b works!");

  } catch (error) {
    console.error("Model test failed:", error.message);
  }
}

listModels();
