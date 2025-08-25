// /api/generate.ts  (Vercel Node.js Serverless Function)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Type Definitions ---
type Id = number | string;
interface Note {
  id: Id;
  title?: string;
  content: string;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
}
interface QA {
  q: string;
  a: string;
}
interface Sentence {
  text: string;
  sourceNoteId: Id | null;
}
interface RagOptions {
  trim?: {
    maxNotes?: number;
    maxCharsPerNote?: number;
    maxTotalChars?: number;
  }
}

// --- Main Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers and handle OPTIONS pre-flight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const payload = req.body ?? {};
    const type = payload.type || 'rag';

    let responseData;
    switch (type) {
      case 'daily_summary':
        responseData = await handleDailySummary(payload);
        break;
      case 'generate_questions':
        responseData = await handleGenerateQuestions(payload);
        break;
      default:
        responseData = await handleRag(payload);
        break;
    }
    return res.status(200).json(responseData);
  } catch (e: any) {
    console.error(`[handler:${e.type || 'unknown'}] error:`, e);
    return res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
}

// --- Logic Handlers ---

class ApiError extends Error {
  statusCode: number;
  type: string;
  constructor(message: string, statusCode = 500, type = 'server') {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
  }
}

async function handleDailySummary(payload: { context: QA[], tomorrow?: string }) {
  const { context, tomorrow } = payload;
  const qa = Array.isArray(context) ? context : [];

  const localFallback = () => {
    const title = (qa.find(x => /what/.test(x.q))?.a || "오늘의 일기").slice(0,30);
    const bullets: string[] = [];
    const pick = (kw: string, label: string) => {
      const f = qa.find(x => x.q.includes(kw));
      if (f && String(f.a || "").trim()) bullets.push(`${label}: ${String(f.a).trim()}`);
    };
    pick("잘 된", "잘 된 것");
    pick("막힌", "막힌 것");
    pick("배운", "배운 것");
    return { title, summary: qa.map(x => `${x.q} ${x.a || ""}`).join("\n").slice(0,800), bullets, tomorrow: tomorrow || "", tags: ["#daily"] };
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return localFallback();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = [
      "다음의 Q/A를 한 편의 **하루 일기**로 요약하세요.",
      "반드시 순수 JSON만. 형식: { \"title\": \"...\", \"summary\": \"...\", \"bullets\": [\"...\"], \"tomorrow\": \"...\", \"tags\": [\"#daily\"] }",
      "사실/숫자 왜곡 금지. 한국어."
    ].join("\n");
    const resp = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt + "\n\n" + JSON.stringify({ qa, tomorrow }) }] }] } );
    const raw = (resp?.response?.text?.() || "").trim();
    const out = tryParseJSON(raw) || localFallback();
    return {
      title: String(out.title || "오늘의 일기"),
      summary: String(out.summary || ""),
      bullets: Array.isArray(out.bullets) ? out.bullets.map(String).slice(0,6) : [],
      tomorrow: String(out.tomorrow || tomorrow || ""),
      tags: Array.isArray(out.tags) ? out.tags.map(String) : ["#daily"]
    };
  } catch (e) {
    console.error("[daily_summary] online gen failed:", e);
    return localFallback();
  }
}

async function handleGenerateQuestions(payload: { context: Note[] }) {
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
  const ctxText = trimmed.map((n,i)=>`[${i+1}] (${n.id}) ${n.title||""}\n${n.content}`).join("\n\n");
  const resp = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: qPrompt + "\n\n" + ctxText }] }]
  });
  const text = (resp?.response?.text?.() || "");
  const parsed = tryParseJSON(text);
  const out = Array.isArray(parsed?.questions) ? parsed.questions.slice(0,3).map(String) : [];
  return { questions: out };
}

async function handleRag(payload: { question: string, context: Note[], options?: RagOptions }) {
  const { question, context, options } = payload;
  if (!question) throw new ApiError("question required", 400, 'client');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError("Missing GEMINI_API_KEY");

  const trimmed = trimContext(context, options?.trim);
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = buildPrompt({ question, context: trimmed });
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
      ? json.sources.filter(s => s && s.noteId).slice(0, 20)
      : mapped.sources;
    json = { answer, sentences: mapped.sentences, sources: srcs };
  }

  if (typeof json.answer !== "string") json.answer = String(json.answer || "");
  if (!Array.isArray(json.sentences)) json.sentences = [];
  if (!Array.isArray(json.sources)) json.sources = [];

  return json;
}


// --- Helper Functions ---

function tryParseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (_) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (_) {}
    }
  }
  return null;
}

function trimContext(context: Note[], {
  maxNotes = 20,
  maxCharsPerNote = 1200,
  maxTotalChars = 18000,
} = {}): Note[] {
  const ctx = Array.isArray(context) ? context.slice(0, maxNotes) : [];
  const sliced = ctx.map(n => ({
    id: String(n.id),
    title: n.title ? String(n.title).slice(0, 160) : undefined,
    content: String(n.content || "").slice(0, maxCharsPerNote),
  }));
  let total = 0;
  const trimmed: Note[] = [];
  for (const n of sliced) {
    const c = n.content;
    if (total + c.length > maxTotalChars) break;
    total += c.length;
    trimmed.push(n);
  }
  return trimmed;
}

function buildPrompt({ question, context }: { question: string, context: Note[] }): string {
  const header = `
너는 철저한 근거주의 어시스턴트다. 반드시 아래 규칙을 지켜라.

[규칙]
1) "제공된 CONTEXT" 내부 정보만 사용해서 답변한다. 외부 지식 추측 금지.
2) 수치·단위·고유명사는 그대로 보존한다.
3) 확실하지 않거나 정보가 없으면 "불확실"을 명시한다.
4) 출력은 반드시 "하나의 JSON 오브젝트"로만 한다. 마크다운/설명/코드블록 금지.
5) 문장 배열(sentences[])의 각 원소에는 해당 문장의 근거 노트 ID(sourceNoteId)를 넣어라.
   - ID는 아래 CONTEXT에 표시된 노트의 id 값 중 하나여야 한다.
   - 확신이 없으면 null로 두고, 최대한 맞추도록 노력하라.

[출력 JSON 스키마]
{
  "answer": "string",
  "sentences": [{"text":"string","sourceNoteId":"string|null"}],
  "sources": [{"noteId":"string","snippet":"string"}]
}
`.trim();

  const ctxText = context.map(n => {
    const title = n.title ? ` (${n.title})` : "";
    return `- [${n.id}]${title} ${n.content}`;
  }).join("\n");

  const user = `
QUESTION:
${question}

CONTEXT:
${ctxText}
`.trim();

  return `${header}\n\n${user}`;
}

function splitSentences(s: string): string[] {
  if (!s || typeof s !== "string") return [];
  const hardSplit = s
    .replace(/\n+/g, " ")
    .split(/(?<=[\]\.\!\?])\s+|(?<=(다|요))\s+/g)
    .map(x => (x || "").trim())
    .filter(Boolean);
  const merged: string[] = [];
  for (const seg of hardSplit) {
    if (!merged.length) { merged.push(seg); continue; }
    if (seg.length < 8 && merged[merged.length - 1].length < 40) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${seg}`.trim();
    } else {
      merged.push(seg);
    }
  }
  return merged;
}

function normalizeTokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/) 
    .filter(w => w && w.length > 1);
}

function jaccard(aArr: string[], bArr: string[]): number {
  const a = new Set(aArr), b = new Set(bArr);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter || 1;
  return inter / uni;
}

function mapSources(answerSentences: Sentence[], context: Note[]) {
  const results: Sentence[] = [];
  const srcSet = new Map<Id, string>();
  const ctx = Array.isArray(context) ? context : [];
  const ctxTokens = ctx.map(n => ({
    id: String(n.id),
    content: String(n.content || ""),
    tokens: normalizeTokens(String(n.content || ""))
  }));

  for (const sent of answerSentences) {
    const text = String(sent?.text || sent || "");
    let srcId: Id | null = sent?.sourceNoteId ?? null;

    if (!srcId || !ctx.some(n => String(n.id) === String(srcId))) {
      const t = normalizeTokens(text);
      let best = { id: null as Id | null, score: 0 };
      for (const c of ctxTokens) {
        const score = jaccard(t, c.tokens);
        if (score > best.score) best = { id: c.id, score };
      }
      srcId = best.score >= 0.08 ? best.id : null;
    }

    results.push({ text, sourceNoteId: srcId });

    if (srcId) {
      const note = ctx.find(n => String(n.id) === String(srcId));
      if (note && !srcSet.has(srcId)) {
        const snippet = String(note.content || "").slice(0, 200);
        srcSet.set(srcId, snippet);
      }
    }
  }

  const sources = Array.from(srcSet, ([noteId, snippet]) => ({ noteId, snippet }));
  return { sentences: results, sources };
}
