const { GoogleGenerativeAI } = require("@google/generative-ai");

// Gemini API Key from environment variables
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Default system instruction
let systemInstruction = `You are a helpful RAG (Retrieval-Augmented Generation) summarizer. Follow these rules strictly:
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { query, contextNotes, type, recentNotes } = JSON.parse(event.body);

    // =================================================================
    // == 🛡️ GUARD CLAUSE: 추가된 예외 처리 로직 (START) ==
    // =================================================================
    if (type === 'generate_answer' && (!contextNotes || contextNotes.length === 0)) {
      console.log("Guard clause triggered: Empty context for generate_answer.");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Cannot generate answer without context." }),
      };
    }

    if (type === 'generate_questions' && (!recentNotes || recentNotes.length === 0)) {
      console.log("Guard clause triggered: Empty recentNotes for generate_questions.");
      // 추천 질문은 오류가 아닌 빈 배열을 반환하여 자연스럽게 처리
      return {
        statusCode: 200,
        body: JSON.stringify({ questions: [] }),
      };
    }
    // =================================================================
    // == 🛡️ GUARD CLAUSE: 추가된 예외 처리 로직 (END) ==
    // =================================================================


    const model = gemini.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      systemInstruction: systemInstruction,
    });

    let userMessage = { role: "user", parts: [] };
    let sourceNoteIds = [];

    if (type === 'generate_answer') {
      systemInstruction = systemInstruction.replace('summarizer', 'question answerer');
      userMessage.parts.push({ text: `Context:n` });
      contextNotes.forEach((note, index) => {
        const docId = `doc_${index}`;
        userMessage.parts.push({ text: `<document id="${docId}">n${note.content}n</document>n` });
        sourceNoteIds.push(docId);
      });
      userMessage.parts.push({ text: `nQuestion: "${query}"nnBased on the context, answer the question.` });
    } else if (type === 'generate_questions') {
      systemInstruction = systemInstruction.replace('summarizer', 'question generator');
      userMessage.parts.push({ text: `Recent notes:n` });
      recentNotes.forEach((note, index) => {
        userMessage.parts.push({ text: `- Note ${index + 1}: "${note.content.substring(0, 150)}..."n` });
      });
      userMessage.parts.push({ text: `nBased on these recent notes, generate 3 interesting and thought-provoking questions. Return a JSON object with a "questions" key containing an array of strings. Example: { "questions": ["...", "...", "..."] }` });
    }

    const result = await model.generateContent(JSON.stringify(userMessage));
    const response = result.response;
    const jsonString = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonResponse = JSON.parse(jsonString);

    if (type === 'generate_answer') {
      jsonResponse.sourceNotes = sourceNoteIds;
    }

    return { 
      statusCode: 200,
      body: JSON.stringify(jsonResponse),
    };
  } catch (error) {
    console.error("Error in generate function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};