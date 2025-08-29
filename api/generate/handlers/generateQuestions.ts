import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Note } from '../types';
import { ApiError } from '../types';
import { trimContext } from '../utils/trim';
import { tryParseJSON } from '../utils/json';

export async function handleGenerateQuestions(payload: { context: Note[] }) {
  const { context } = payload;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError("Missing GEMINI_API_KEY");

  const trimmed = trimContext(context, { maxNotes: 10, maxCharsPerNote: 800, maxTotalChars: 6000 });
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });
  const qPrompt = [
    "아래 노트들에서 사용자가 던질 법한 흥미롭고 구체적인 질문 3개를 만드세요.",
    "반드시 유니코드 안전한 순수 JSON으로만 응답하세요.",
    "형식: { \"questions\": [\"...?\", \"...?\", \"...?\"] }",
    "한국어로 작성하세요. 물음표로 끝내세요."
  ].join("\n");
  const ctxText = trimmed.map((n,i)=>`[${i+1}] (${n.id}) ${n.title||''}\n${n.content}`).join("\n\n");
  const resp = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: qPrompt + "\n\n" + ctxText }] }]
  });
  const text = (resp?.response?.text?.() || "");
  const parsed = tryParseJSON(text);
  const out = Array.isArray(parsed?.questions) ? parsed.questions.slice(0,3).map(String) : [];
  return { questions: out };
}
