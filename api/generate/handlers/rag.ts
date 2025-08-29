
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Note, RagOptions } from '../types';
import { ApiError } from '../types';
import { trimContext } from '../utils/trim';
import { buildSystemPrompt, buildUserPrompt } from '../utils/prompt';
import { tryParseJSON } from '../utils/json';
import { splitSentences, mapSources } from '../utils/rag';

export async function handleRag(payload: { question: string, context: Note[], options?: RagOptions }) {
  const { question, context, options } = payload;
  if (!question) throw new ApiError("question required", 400, 'client');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError("Missing GEMINI_API_KEY");

  const trimmed = trimContext(context, options?.trim);
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: buildSystemPrompt(),
  });
  const prompt = buildUserPrompt({ question, context: trimmed });
  const resp = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
  const raw = resp?.response?.text?.() ?? "";
  let json = tryParseJSON(raw);

  if (!json || typeof json !== "object") {
    const fallbackAnswer = String(raw || "").trim();
    const sentences = splitSentences(fallbackAnswer).map(t => ({ text: t, sourceNoteId: null }));
    const mapped = mapSources(sentences, trimmed);
    json = { answer: fallbackAnswer, sentences: mapped.sentences, sources: mapped.sources };
  } else {
    const answer = typeof json.answer === "string" ? json.answer : "";
    const sentencesArr = Array.isArray(json.sentences) ? json.sentences : splitSentences(answer).map(t => ({ text: t, sourceNoteId: null }));
    const mapped = mapSources(sentencesArr, trimmed);
    const srcs = Array.isArray(json.sources) && json.sources.length
      ? json.sources.filter((s: { noteId: string; }) => s && s.noteId).slice(0, 20)
      : mapped.sources;
    json = { answer, sentences: mapped.sentences, sources: srcs };
  }

  if (typeof json.answer !== "string") json.answer = String(json.answer || "");
  if (!Array.isArray(json.sentences)) json.sentences = [];
  if (!Array.isArray(json.sources)) json.sources = [];

  return json;
}
