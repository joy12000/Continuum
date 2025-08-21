
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

    const body = JSON.parse(event.body || "{}");
    // Support both the old RAG format and the new "zero-shot" question format
    const { question, contexts = [], prompt } = body;

    let systemInstruction, userPrompt, responseMimeType;

    if (prompt && typeof prompt === 'string') {
      // New "zero-shot" question generation
      systemInstruction = `You are a helpful assistant that generates questions based on provided text.
Follow these rules strictly:
1.  **Analyze the user's notes.** Understand the main topics and ideas.
2.  **Generate 3 distinct and insightful questions.** The questions should be something a user would be genuinely curious about.
3.  **Output in the specified JSON format.** The output must be a single, valid JSON object with a "questions" key containing an array of strings.

Example output format:
{"questions": ["What are the main advantages of X?", "How does Y compare to Z?", "What is the first step to start learning about A?"]}`;
      userPrompt = prompt;
      responseMimeType = "application/json";

    } else if (question) {
      // Original RAG functionality
      systemInstruction = `You are a helpful RAG (Retrieval-Augmented Generation) summarizer. Follow these rules strictly:
1.  **Answer only within the provided context.** Do not use any external knowledge. If the context does not contain the answer, state "제공된 정보 내에서 답변을 찾을 수 없습니다."
2.  **Preserve numerical values, units, and specific entities** (like names, locations) from the context accurately. Do not rephrase or approximate them.
3.  **Express uncertainty.** If the answer is not clearly or directly supported by the context, use phrases like "~인 것으로 보입니다" or "~일 가능성이 있습니다."
4.  **Output in the specified JSON format ONLY.** The output must be a single, valid JSON object.
5.  The JSON object must contain an 'answerSegments' key, which is an array of objects.
6.  Each object in the 'answerSegments' array must have two keys: a 'sentence' (a single, complete sentence) and a 'sourceNoteId' (the ID of the context document it came from, like "doc_0").

Example output format:
{
  "answerSegments": [
    { "sentence": "The first key point derived from the context.", "sourceNoteId": "doc_0" },
    { "sentence": "Another detail found in a different document.", "sourceNoteId": "doc_2" },
    { "sentence": "A final summary point from the first document.", "sourceNoteId": "doc_0" }
  ],
  "sourceNotes": ["doc_0", "doc_1", "doc_2"]
}`;
      const cappedContexts = (Array.isArray(contexts) ? contexts : []).slice(0, 10).map((s, i) => ({ id: s.id || `doc_${i}`, content: String(s.content).slice(0, 2000) }));
      userPrompt = [
        "Question: " + question,
        "Contexts:",
        ...cappedContexts.map(c => `(ID: ${c.id}) ${c.content}`)
      ].join("\n");
      responseMimeType = "application/json";

    } else {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Missing 'question' or 'prompt'" }) };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const requestBody = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048, response_mime_type: responseMimeType },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
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

    // The model should return valid JSON, so we just parse and forward it.
    try {
      JSON.parse(responseText); // Validate JSON
      return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: responseText };
    } catch (e) {
      console.error("Failed to parse JSON response from model:", e);
      const errorMessage = `The model returned a response that was not valid JSON. Raw response: ${responseText.slice(0, 500)}`;
      // Depending on the request type, return a differently structured error
      const errorBody = prompt 
        ? { questions: [errorMessage] } 
        : { answer: [{ sentence: errorMessage, sourceNoteId: "error-invalid-format" }] };
      return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(errorBody) };
    }

  } catch (e) {
    const msg = (e && e.name === "AbortError") ? "Upstream timeout" : String(e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: msg }) };
  }
};
