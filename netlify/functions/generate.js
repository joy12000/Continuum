exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }
  try {
    const { question, contexts } = JSON.parse(event.body || "{}");
    if (!process.env.API_KEY || !process.env.MODEL_ENDPOINT) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Missing API_KEY or MODEL_ENDPOINT env" }) };
    }
    const r = await fetch(process.env.MODEL_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ question, contexts })
    });
    const text = await r.text();
    return { statusCode: r.status, headers: { ...cors, "Content-Type": r.headers.get("content-type") || "application/json" }, body: text };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: String(e) }) };
  }
};
