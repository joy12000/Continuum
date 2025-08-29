
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { QA } from '../types';
import { tryParseJSON } from '../utils/json';

export async function handleDailySummary(payload: { context: QA[], tomorrow?: string }) {
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
