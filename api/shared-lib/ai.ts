import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Note } from "./types.js";

const MODEL = process.env.MOMENTUM_GEMINI_MODEL || "gemini-1.5-flash";

function requireEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required.`);
  return v;
}

const genAI = new GoogleGenerativeAI(requireEnv("GEMINI_API_KEY"));

export async function summarizeThread(notes: Note[]): Promise<{ title: string; summary: string }> {
  // Sort by created_at to elicit a "narrative over time"
  const timeline = [...notes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const bullets = timeline.map((n, i) => {
    const stamp = new Date(n.created_at).toISOString().slice(0, 10);
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
  const startIndex = text.indexOf('{');
  const endIndex = text.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    text = text.substring(startIndex, endIndex + 1);
  }

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
  const timeline = [...notes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.title === "string" && typeof parsed.summary === "string") {
      return { title: parsed.title, summary: parsed.summary };
    }
  } catch {}
  const title = (text.match(/"title"\s*:\s*"([^"]+)"/)?.[1]) || "하루의 생각들";
  const summary = (text.match(/"summary"\s*:\s*"([\s\S]*?)"\s*\}/)?.[1] || "요약 생성에 실패했습니다.");
  return { title, summary };
}

export async function generateTitleAndTags(noteBody: string): Promise<{ title: string; tags: string[] }> {
  if (!noteBody.trim()) {
    return { title: "제목 없음", tags: [] };
  }

  const bodyExcerpt = noteBody.slice(0, 1500);

  const prompt = `You are a content analyst. Based on the following note, perform two tasks:
1.  **Generate a title**: Create a concise, insightful Korean title (5-8 words) that captures the core theme.
2.  **Extract tags**: Identify and list 3-5 main keywords or topics as an array of Korean strings.

Return the result strictly as a JSON object with keys: "title" (string) and "tags" (array of strings).

Note Content:
---
${bodyExcerpt}
---

Your response must be ONLY the raw JSON object.
`;
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, '');

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.title === "string" && Array.isArray(parsed.tags)) {
      const tags = parsed.tags.filter((t: any) => typeof t === 'string' && t.length > 0 && t.length < 20);
      return { title: parsed.title || "새로운 노트", tags };
    }
  } catch (e) {
    console.error("Failed to parse AI response for title/tags:", text, e);
  }

  // Fallback
  return { title: "새로운 노트", tags: [] };
}

export async function connectNewNote(
  newNoteText: string,
  contextNotes: { id: string; body: string }[]
): Promise<{ summary: string }> {
  const contextBullets = contextNotes
    .map((n) => `- (과거 노트) ${n.body.slice(0, 400).replace(/\n/g, ' ')}`)
    .join('\n');

  const prompt = `You are a Knowledge Synthesizer. Your mission is to find the connection between a user's new thought and their past ideas.
You will be given a "New Note" and a "Context" of related past notes.

Your task is to generate a JSON object with a single key: "summary".

1.  **summary**:
    *   Analyze the New Note in relation to the Context.
    *   Write a 2-4 sentence narrative in Korean that explains how the New Note relates to, evolves from, or contrasts with the ideas in the Context.
    *   Focus on creating a story of evolving thoughts. Do not just list the topics.
    *   If the connection is weak, you can state that the new note introduces a new line of thought while briefly mentioning the existing context.
    *   Base your summary *only* on the provided New Note and Context. Do not invent information.

Context from past notes:
---
${contextBullets}
---

New Note:
---
${newNoteText}
---

Your response must be ONLY the raw JSON object, like {"summary": "..."}.
`;

  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  let text = result.response.text();

  // Clean the response before parsing
  text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  const startIndex = text.indexOf('{');
  const endIndex = text.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    text = text.substring(startIndex, endIndex + 1);
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.summary === 'string') {
      return { summary: parsed.summary };
    }
  } catch (e) {
    console.error("Failed to parse AI response for connectNewNote as JSON:", text, e);
    return { summary: text }; // Fallback to raw text
  }
  return { summary: "AI가 생각을 연결하는 데 실패했습니다." };
}