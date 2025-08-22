const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";

// CORS helper
function cors(headers = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...headers,
  };
}

exports.handler = async function (event) {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors(), body: "Method Not Allowed" };
  }

  try {
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers: cors(),
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY env var" }),
      };
    }
    const { texts, output_dimensionality } = JSON.parse(event.body || "{}");
    if (!Array.isArray(texts) || texts.length === 0) {
      return {
        statusCode: 400,
        headers: cors(),
        body: JSON.stringify({ error: "Invalid input: 'texts' must be a non-empty array." }),
      };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    // Use batch embeddings; align dims with on-device (default 768)
    const result = await model.batchEmbedContents({
      requests: texts.map((text) => ({
        content: { parts: [{ text: String(text) }] },
        ...(output_dimensionality ? { outputDimensionality: output_dimensionality } : { outputDimensionality: 768 }),
      })),
    });

    const vectors = (result.embeddings || []).map((e) => e.values || []);
    return {
      statusCode: 200,
      headers: cors({ "Content-Type": "application/json" }),
      body: JSON.stringify({ vectors }),
    };
  } catch (err) {
    console.error("Embedding error:", err);
    return {
      statusCode: 500,
      headers: cors({ "Content-Type": "application/json" }),
      body: JSON.stringify({ error: "Failed to generate embeddings.", details: String(err?.message || err) }),
    };
  }
};
