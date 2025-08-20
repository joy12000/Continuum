
// netlify/functions/generate.js — Gemini paid proxy
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
const TIMEOUT_MS = +(process.env.TIMEOUT_MS || 30000);

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  try {
    if (!API_KEY) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
    }

    const { question, contexts = [] } = JSON.parse(event.body || "{}");
    if (!question) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Missing 'question'" }) };
    }

    const cappedContexts = (Array.isArray(contexts) ? contexts : []).slice(0, 10).map((s, i) => ({ id: s.id || `doc_${i}`, content: String(s.content).slice(0, 2000) }));
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;

    const systemInstruction = `You are a helpful RAG (Retrieval-Augmented Generation) summarizer. Follow these rules strictly:
1.  **Answer only within the provided context.** Do not use any external knowledge.
2.  **Preserve numerical values** and specific details from the context accurately.
3.  **Express uncertainty.** If the answer is not clearly supported by the context, state that the context does not provide a definitive answer.
4.  **Output in the specified JSON format.** The output must be a single JSON object containing an 'answer' array. Each object in the array must have a 'sentence' and a 'sourceNoteId' corresponding to the provided context document IDs.

Example output format:
{
  "answer": [
    { "sentence": "The first key point derived from the context.", "sourceNoteId": "doc_0" },
    { "sentence": "Another detail found in a different document.", "sourceNoteId": "doc_2" },
    { "sentence": "A final summary point from the first document.", "sourceNoteId": "doc_0" }
  ]
}`;

    const prompt = [
      "Question: " + question,
      "Contexts:",
      ...cappedContexts.map(c => `(ID: ${c.id}) ${c.content}`)
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048, response_mime_type: "application/json" },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { statusCode: response.status, headers: { ...cors, "Content-Type": "application/json" }, body: errorText || JSON.stringify({ error: response.statusText }) };
    }

    const data = await response.json();
    let responseText = "";
    try {
      const candidate = data?.candidates?.[0];
      if (candidate?.content?.parts?.length) {
        const part = candidate.content.parts.find((p) => typeof p.text === "string");
        responseText = part?.text || "";
      }
    } catch (e) {
      console.error("Error extracting text from Gemini response:", e);
    }

    // Attempt to parse the JSON, with a fallback for malformed output
    let parsedResult;
    try { parsedResult = JSON.parse(responseText);
      if (!Array.isArray(parsedResult.answer)) {
        throw new Error("Invalid JSON structure: 'answer' is not an array.");
      }
    } catch (e) {
      console.error("Failed to parse JSON response from model:", e);
      // Create a fallback error response that still fits the expected structure
      parsedResult = {
        answer: [{ 
          sentence: "The model returned a response that was not in the expected JSON format. The raw response was: " + responseText.slice(0, 500),
          sourceNoteId: "error-invalid-format"
        }]
      };
    }

    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(parsedResult) };
  } catch (e) {
    const msg = (e && e.name === "AbortError") ? "Upstream timeout" : String(e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: msg }) };
  }
};
