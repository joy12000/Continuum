
/// <reference lib="webworker" />

type Msg =
  | { id: string; type: "ensure"; payload: { pref: "auto" | "remote" } }
  | { id: string; type: "embed"; payload: { pref: "auto" | "remote"; texts: string[] } };



self.addEventListener("message", async (e: MessageEvent<Msg>) => {
  const { id, type, payload } = e.data;
  try {
    if (type === "ensure") {
      const { getSemanticAdapter } = await import("../lib/semantic");
      const a = await getSemanticAdapter(payload.pref);
      const ready = await a.ensureReady();
      self.postMessage({ id, ok: true, result: { name: a.name, ready } });
      return;
    }
    if (type === "embed") {
      const { getSemanticAdapter } = await import("../lib/semantic");
      const a = await getSemanticAdapter(payload.pref);
      await a.ensureReady();
      const vecs = await a.embed(payload.texts);
      self.postMessage({ id, ok: true, result: vecs });
      return;
    }
    self.postMessage({ id, ok: false, error: "Unknown command" });
  } catch (err: any) {
    self.postMessage({ id, ok: false, error: String(err?.message || err) });
  }
});
