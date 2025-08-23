// netlify/functions/embed.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true, endpoint: "embed",
        requires: ["GEMINI_API_KEY"],
        note: "POST { texts: string[], output_dimensionality?: number }"
      })
    };
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  try {
    const { texts, output_dimensionality } = JSON.parse(event.body || "{}");
    if (!Array.isArray(texts) || texts.length === 0) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "texts[] required" }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";
    const model = genAI.getGenerativeModel({ model: modelName });

    const requests = texts.map(t => ({
      content: { parts: [{ text: String(t) }] },
      ...(output_dimensionality ? { outputDimensionality: output_dimensionality } : {}),
    }));
    const res = await model.batchEmbedContents({ requests });
    const vectors = res.embeddings.map(e => e.values);

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ vectors })
    };
  } catch (err) {
    console.error("embed error", err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Failed to generate embeddings", details: String(err?.message || err) })
    };
  }
};
