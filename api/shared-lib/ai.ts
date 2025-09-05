import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Note } from "./types.js";

const MODEL = process.env.CONTINUUM_GEMINI_MODEL || "gemini-1.5-flash";

function requireEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required.`);
  return v;
}

const genAI = new GoogleGenerativeAI(requireEnv("GEMINI_API_KEY"));

export async function summarizeThread(notes: Note[]): Promise<{ title: string; summary: string }> {
  // Sort by created_at to elicit a "narrative over time"
  const timeline = [...notes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const bullets = timeline.map((n, i) => {
    const stamp = new Date(n.createdAt).toISOString().slice(0, 10);
    const title = n.title ?? `Note ${i + 1}`;
    const tags = (n.tags ?? []).slice(0, 6).join(", ");
    const body = (n.body ?? "").slice(0, 400);
    return `- [${stamp}] ${title}${tags ? ` (tags: ${tags})` : ""}: ${body}`;
  }).join("\n");

  const prompt = `You are a Knowledge Synthesizer. Your mission is to analyze a user's notes and uncover the deeper, underlying insights.
  You will be given a list of chronologically sorted notes that form a potential "insight thread".
  
  Your task is to generate a JSON object with two keys: "title" and "summary".
  
  1.  **summary**:
      *   Do NOT just list the notes.
      *   Synthesize the information to tell a story about the user's evolving thoughts.
      *   Identify the core theme or question. What is the "so what?" or the hidden connection between these notes?
      *   The summary should be a concise narrative of 6-10 sentences.
      *   **The summary must be in Korean.**
  
  2.  **title**:
      *   Based on the summary, create a short, insightful title (max 8 words).
      *   The title should capture the essence of the discovered insight. Avoid generic titles.
      *   **The title must be in Korean.**
  
  Here are the notes:
  ${bullets}
  
  Your response must be ONLY the raw JSON object, without any markdown formatting, backticks, or other explanatory text.
  `;

  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  let text = result.response.text();

  // Clean the response before parsing
  text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.title === "string" && typeof parsed.summary === "string") {
      return { title: parsed.title, summary: parsed.summary };
    }
  } catch (e) {
      console.error("Failed to parse AI response as JSON:", text, e);
      // Fallback if JSON is still broken
      return { title: "요약 실패", summary: "AI로부터 받은 응답을 처리하는 데 실패했습니다." };
  }
  // Final fallback
  return { title: "요약 실패", summary: "AI 응답에서 제목과 요약을 추출하지 못했습니다." };
}

export async function summarizeDay(notes: Note[]): Promise<{ title: string; summary: string }> {
  // Sort by created_at to keep a chronological flow within the day
  const timeline = [...notes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const bullets = timeline.map((n, i) => {
    const title = n.title ?? `Note ${i + 1}`;
    const body = (n.body ?? "").slice(0, 600); // Limit content length
    return `- ${title}: ${body}`;
  }).join("\n");

  const prompt = `You are an analytical assistant. Based on the following notes from a single day, please perform two tasks:
1. Create a concise, insightful title that captures the main theme of the day's thoughts. The title should be a maximum of 8 words and in Korean.
2. Write a short narrative summary (3-5 sentences) that connects the ideas from the notes, reflecting on the day's activities or thoughts. The summary must be in Korean.

Return the result strictly as a JSON object with keys: "title" and "summary".

Today's Notes:
${bullets}
`;

  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  try {
    const parsed = JSON.JSON.parse(text);
    if (parsed && typeof parsed.title === "string" && typeof parsed.summary === "string") {
      return { title: parsed.title, summary: parsed.summary };
    }
  } catch {}
  const title = (text.match(/"title"\s*:\s*"([^"]+)"/)?.[1]) || "하루의 생각들";
  const summary = (text.match(/"summary"\s*:\s*"([\s\S]*?)"\s*\}/)?.[1] || "요약 생성에 실패했습니다.");
  return { title, summary };
}