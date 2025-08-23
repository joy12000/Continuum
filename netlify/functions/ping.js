exports.handler = async (event) => {
  const path = event.path || "/api/ping";
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ ok: true, path, ts: Date.now() }),
  };
};
