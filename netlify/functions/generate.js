// netlify/functions/generate.js
// CJS-style Netlify function with CORS + robust daily_summary branch.
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

// --- helpers ---
const cors = {
  headers(req) {
    const origin = req?.headers?.origin || "*";
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
  }
};

function toJSONSafe(text) {
  if (!text) return null;
  // Try: raw parse
  try { return JSON.parse(text); } catch {}
  // Try: extract first {...} block
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function fallbackDailySummary(context = [], tomorrow = "") {
  const title = (context.find(x => /뭐했/.test(x.q))?.a || "오늘의 일기").slice(0, 30);
  const bullets = [];
  const add = (k, label) => {
    const v = context.find(x => x.q.includes(k))?.a || "";
    if (v.trim()) bullets.push(`${label}: ${v.trim()}`);
  };
  add("잘 된", "잘 된 것");
  add("막힌", "막힌 것");
  add("배운", "배운 것");
  return {
    title,
    summary: (context.map(x => `${x.q} ${x.a}`)).join("\n").slice(0, 800),
    bullets: bullets.slice(0, 5),
    tomorrow: tomorrow || "",
    tags: ["#daily"]
  };
}

// --- handler ---
exports.handler = async (event, _ctx) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors.headers(event) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const type = body?.type;

    if (type === "daily_summary") {
      const context = Array.isArray(body.context) ? body.context : [];
      const tomorrow = body.tomorrow || "";

      // If no API key -> fallback immediately
      if (!GEMINI_KEY) {
        const res = fallbackDailySummary(context, tomorrow);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", ...cors.headers(event) },
          body: JSON.stringify({ ok: true, daily: res, used: "fallback" })
        };
      }

      // Call Gemini (minimal REST)
      const prompt = [
        "다음의 Q/A를 한 편의 일기처럼 요약해.",
        "반드시 JSON만. 형태:",
        '{ "title": "...", "summary": "...", "bullets": ["...","..."], "tomorrow": "...", "tags": ["#daily","..."] }',
        "숫자/사실 왜곡 금지, 한국어."
      ].join("\n");

      const userContent = context.map(x => `${x.q}\n${x.a}`).join("\n\n");

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
      const payload = {
        contents: [{ parts: [{ text: prompt + "\n\n" + userContent }] }],
        generationConfig: { temperature: 0.2 }
      };

      let text = "";
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const j = await r.json();
        text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } catch (e) {
        // ignore -> will fallback
      }

      const parsed = toJSONSafe(text);
      const data = parsed || fallbackDailySummary(context, tomorrow);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...cors.headers(event) },
        body: JSON.stringify({ ok: true, daily: data, used: parsed ? "gemini" : "fallback" })
      };
    }

    // Unknown type -> 400
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", ...cors.headers(event) },
      body: JSON.stringify({ ok: false, error: "unknown_type" })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...cors.headers(event) },
      body: JSON.stringify({ ok: false, error: String(err && err.message || err) })
    };
  }
};
