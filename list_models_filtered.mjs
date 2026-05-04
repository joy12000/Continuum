
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import * as path from 'path';
import fetch from 'node-fetch';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModelsFiltered() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const flashModels = data.models.filter(m => m.name.includes("flash"));
    console.log("Flash Models:", flashModels.map(m => m.name));
    
    const proModels = data.models.filter(m => m.name.includes("pro"));
    console.log("Pro Models:", proModels.map(m => m.name));

  } catch (error) {
    console.error("Failed:", error);
  }
}

listModelsFiltered();
