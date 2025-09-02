import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Note } from "./types.js";

const MODEL = process.env.CONTINUUM_GEMINI_MODEL || "gemini-1.5-pro";

function requireEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required.`);
  return v;
}

const genAI = new GoogleGenerativeAI(requireEnv("GOOGLE_API_KEY"));

export async function summarizeThread(notes: Note[]): Promise<{ title: string; summary: string }> {
  // Sort by created_at to elicit a "narrative over time"
  const timeline = [...notes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const bullets = timeline.map((n, i) => {
    const stamp = new Date(n.created_at).toISOString().slice(0, 10);
    const title = n.title ?? `Note ${i + 1}`;
    const tags = (n.tags ?? []).slice(0, 6).join(", ");
    const content = (n.content ?? "").slice(0, 600);
    return `- [${stamp}] ${title}${tags ? ` (tags: ${tags})` : ""}: ${content}`;
  }).join("\n");

  const prompt = `You are an analytical assistant building "insight threads" out of a user's notes.
You get a chronological list of notes. Your job:
1) Infer the unifying topic.
2) Write a narrative summary (6-10 sentences) that shows how the user's thinking evolves over time.
3) Produce a short, specific, human-friendly title (max 8 words). Avoid generic words like "Misc", "Notes", "Thread".
4) Write in the user's voice if visible, neutral otherwise. Avoid fluff.

Return strictly as JSON with keys: title, summary.

Notes (chronological):
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
  // Fallback: heuristic extraction
  const title = (text.match(/"title"\s*:\s*"([^"]+)"/)?.[1]) || "Insight Thread";
  const summary = (text.match(/"summary"\s*:\s*"([\s\S]*?)"\s*\}/)?.[1]) || text.slice(0, 1200);
  return { title, summary };
}
