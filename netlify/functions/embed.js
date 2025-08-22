
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Gemini API Key from environment variables
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const { texts, output_dimensionality } = JSON.parse(event.body);

    if (!Array.isArray(texts) || texts.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid input: 'texts' must be a non-empty array." }),
      };
    }

    const model = gemini.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    const result = await model.batchEmbedContents({
      requests: texts.map(text => ({
        content: { parts: [{ text }] },
        outputDimensionality: output_dimensionality,
      })),
    });

    const vectors = result.embeddings.map(e => e.values);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vectors }),
    };
  } catch (error) {
    console.error("Embedding error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate embeddings.", details: error.message }),
    };
  }
};
