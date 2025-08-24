// --- Continuum Guardrails (v4.0) ---
        const SYSTEM_PROMPT = `
You are a precise assistant. Follow ALL rules:
1) Answer STRICTLY within the provided context. If missing, say "정보가 부족합니다" and explain what is missing.
2) Preserve all numbers and units as given. Do not round unless asked.
3) If uncertain, explicitly state uncertainty (불확실) and avoid fabrication.
4) Output MUST be valid JSON only with fields: answer, sentences, sources.
`;

// netlify/functions/generate.js
// Gemini RAG: 컨텍스트 한정 답변 + 문장별 sourceNoteId + 견고한 JSON 파싱/폴백
// 요구 env:
//   GEMINI_API_KEY (필수)
//   GEMINI_MODEL   (선택, 기본: "gemini-1.5-flash")
// 반환 JSON 스키마:
//   {
//     "answer": "string",
//     "sentences": [{"text":"string","sourceNoteId":"string|null"}],
//     "sources": [{"noteId":"string","snippet":"string"}]
//   }

const { GoogleGenerativeAI } = require("@google/generative-ai");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function tryParseJSON(text) {
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

function splitSentences(s) {
  if (!s || typeof s !== "string") return [];
  const hardSplit = s
    .replace(/\n+/g, " ")
    .split(/(?<=[\.\!\?])\s+|(?<=(다|요))\s+/g)
    .map(x => (x || "").trim())
    .filter(Boolean);
  const merged = [];
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

function normalizeTokens(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(w => w && w.length > 1);
}

function jaccard(aArr, bArr) {
  const a = new Set(aArr), b = new Set(bArr);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter || 1;
  return inter / uni;
}

function mapSources(answerSentences, context) {
  const results = [];
  const srcSet = new Map();
  const ctx = Array.isArray(context) ? context : [];
  const ctxTokens = ctx.map(n => ({
    id: String(n.id),
    content: String(n.content || ""),
    tokens: normalizeTokens(String(n.content || ""))
  }));

  for (const sent of answerSentences) {
    const text = String(sent?.text || sent || "");
    let srcId = sent?.sourceNoteId ?? null;

    if (!srcId || !ctx.some(n => String(n.id) === String(srcId))) {
      const t = normalizeTokens(text);
      let best = { id: null, score: 0 };
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

function trimContext(context, {
  maxNotes = 20,
  maxCharsPerNote = 1200,
  maxTotalChars = 18000,
} = {}) {
  const ctx = Array.isArray(context) ? context.slice(0, maxNotes) : [];
  const sliced = ctx.map(n => ({
    id: String(n.id),
    title: n.title ? String(n.title).slice(0, 160) : undefined,
    content: String(n.content || "").slice(0, maxCharsPerNote),
  }));
  let total = 0;
  const trimmed = [];
  for (const n of sliced) {
    const c = n.content;
    if (total + c.length > maxTotalChars) break;
    total += c.length;
    trimmed.push(n);
  }
  return trimmed;
}

function buildPrompt({ question, context }) {
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

[예시]
입력:
QUESTION:
"UI 프레임워크가 뭐야?"

CONTEXT:
- [n4] The UI is built with React and Vite.

출력:
{
  "answer": "UI는 React와 Vite로 구성되어 있다.",
  "sentences": [
    {"text":"UI는 React와 Vite로 구성되어 있다.","sourceNoteId":"n4"}
  ],
  "sources": [{"noteId":"n4","snippet":"The UI is built with React and Vite."}]
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

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        endpoint: "generate",
        requires: ["GEMINI_API_KEY"],
        note: "POST { question: string, context: [{id, title?, content}], options? }"
      })
    };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const question = String(payload.question || "");

// --- daily_summary (lenient) ---
const reqType = String(payload.type || payload.mode || payload.action || "");
const looksLikeQAContext = Array.isArray(payload.context) && payload.context.length && payload.context.every(x => typeof x?.q === "string");
if (reqType === "daily_summary" || looksLikeQAContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  const tomorrow = String(payload.tomorrow || "");
  const qa = Array.isArray(payload.context) ? payload.context : [];
  // If no key, do a local fallback summary so user never loses their diary
  async function localFallback() {
    const title = (qa.find(x => /뭐했/.test(x.q))?.a || "오늘의 일기").slice(0,30);
    const bullets = [];
    const pick = (kw, label) => {
      const f = qa.find(x => x.q.includes(kw));
      if (f && String(f.a || "").trim()) bullets.push(`${label}: ${String(f.a).trim()}`);
    };
    pick("잘 된", "잘 된 것");
    pick("막힌", "막힌 것");
    pick("배운", "배운 것");
    return { title, summary: qa.map(x => `${x.q} ${x.a || ""}`).join("\n").slice(0,800), bullets, tomorrow, tags: ["#daily"] };
  }

  let out = null;
  if (apiKey) {
    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
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
      try {
        out = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) try { out = JSON.parse(m[0]); } catch {}
      }
    } catch (e) {
      console.error("[daily_summary] online gen failed:", e);
    }
  }
  if (!out) out = await localFallback();

  const normalized = {
    title: String(out.title || "오늘의 일기"),
    summary: String(out.summary || ""),
    bullets: Array.isArray(out.bullets) ? out.bullets.map(String).slice(0,6) : [],
    tomorrow: String(out.tomorrow || tomorrow || ""),
    tags: Array.isArray(out.tags) ? out.tags.map(String) : ["#daily"]
  };
  // Return both shapes for backward-compat
  return {
    statusCode: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, type: "daily_summary", daily: normalized, ...normalized })
  };
}
// --- zero-shot questions branch ---
const reqType = String(payload.type || "");
if (reqType === "generate_questions") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
  }
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
  let text = "";
  try {
    const resp = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: qPrompt + "\n\n" + ctxText }]}]
    });
    text = (resp?.response?.text?.() || "");
  } catch (e) {
    console.error("generate_questions error:", e);
  }
  const parsed = safeParseJSON(text);
  const out = Array.isArray(parsed?.questions) ? parsed.questions.slice(0,3).map(String) : [];
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ questions: out }) };
}

    
// --- daily summary branch ---
if (reqType === "daily_summary") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = [
    "다음의 Q/A를 한 편의 **하루 일기**로 요약하세요.",
    "반드시 순수 JSON으로만 답하세요. 형식:",
    '{ "title": "...", "summary": "...", "bullets": ["..."], "tomorrow": "...", "tags": ["#daily"] }',
    "사실/숫자 왜곡 금지. 한국어."
  ].join("\n");
  const qa = Array.isArray(payload.context) ? payload.context : [];
  const tomorrow = String(payload.tomorrow || "");
  let text = "";
  try{
    const resp = await model.generateContent({ contents: [{ role:"user", parts:[{ text: prompt + "\n\n" + JSON.stringify({ qa, tomorrow }) }]}] });
    text = (resp?.response?.text?.() || "");
  }catch(e){
    console.error("daily_summary error:", e);
  }
  const parsed = safeParseJSON(text) || {};
  // normalize
  const out = {
    title: String(parsed.title || "오늘의 일기"),
    summary: String(parsed.summary || ""),
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.map(String).slice(0,6) : [],
    tomorrow: String(parsed.tomorrow || tomorrow || ""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : ["#daily"]
  };
  return { statusCode: 200, headers: CORS, body: JSON.stringify(out) };
}
const context = payload.context || [];
    const options = payload.options || {};

    if (!question) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "question required" }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
    }

    const trimmed = trimContext(context, options.trim || undefined);

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = buildPrompt({ question, context: trimmed });

    // ✅ 핵심 수정: 배열이 아니라 'contents' 요청 객체로 전달
    const resp = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });

    const raw = resp?.response?.text?.() ?? "";
    let json = tryParseJSON(raw);

    if (!json || typeof json !== "object") {
      const fallbackAnswer = String(raw || "").trim();
      const sentences = splitSentences(fallbackAnswer).map(t => ({ text: t, sourceNoteId: null }));
      const mapped = mapSources(sentences, trimmed);
      json = {
        answer: fallbackAnswer,
        sentences: mapped.sentences,
        sources: mapped.sources
      };
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

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify(json)
    };
  } catch (err) {
    console.error("[generate] error:", err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        error: "Failed to generate",
        details: String(err?.message || err)
      })
    };
  }
};
