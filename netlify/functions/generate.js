
// netlify/functions/generate.js — Gemini paid proxy
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
const TIMEOUT_MS = +(process.env.TIMEOUT_MS || 30000);

export async function handler(event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };
  try {
    if (!API_KEY) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
    const { question, contexts = [] } = JSON.parse(event.body || "{}");
    if (!question) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Missing 'question'" }) };

    const capped = (Array.isArray(contexts) ? contexts : []).slice(0, 6).map(s => String(s).slice(0, 1200));
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;

    const sys = `You are a helpful RAG summarizer. Return pure JSON: {"summary":"...","bullets":["..."],"attributions":[0,1,2]}`;
    const prompt = ["질문: " + question, "근거:", ...capped.map((c,i)=>`(${i}) ${c}`)].join("\n");

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const body = {
      system_instruction: { parts: [{ text: sys }] },
      contents: [{ role: "user", parts: [{ text: prompt }]}],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024, response_mime_type: "application/json" }
    };

    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    clearTimeout(to);

    if (!r.ok) {
      const errText = await r.text().catch(()=> "");
      return { statusCode: r.status, headers: { ...cors, "Content-Type": "application/json" }, body: errText || JSON.stringify({ error: r.statusText }) };
    }

    const data = await r.json();
    let text = "";
    try {
      const candidate = data?.candidates?.[0];
      if (candidate?.content?.parts?.length) {
        const part = candidate.content.parts.find(p => typeof p.text === "string");
        text = part?.text || "";
      }
    } catch {}

    let parsed;
    try { parsed = JSON.parse(text); }
    catch {
      parsed = { summary: (text || "").slice(0, 300), bullets: (text || "").split(/\n+/).filter(Boolean).slice(0,5), attributions: [] };
    }

    const result = {
      summary: String(parsed.summary || ""),
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.map(String) : [],
      attributions: Array.isArray(parsed.attributions) ? parsed.attributions.map(n => +n).filter(Number.isFinite) : []
    };

    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(result) };
  } catch (e) {
    const msg = (e && e.name === "AbortError") ? "Upstream timeout" : String(e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: msg }) };
  }
}
