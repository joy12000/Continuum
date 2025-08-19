
export class SemWorkerClient {
  private worker: Worker;
  private pending = new Map<string, { resolve: (v: any)=>void; reject: (e:any)=>void }>();

  constructor() {
    this.worker = new Worker(new URL("../workers/semanticWorker.ts?worker", import.meta.url), { type: "module" });
    this.worker.addEventListener("message", (e: MessageEvent) => {
      const { id, ok, result, error } = e.data || {};
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      ok ? p.resolve(result) : p.reject(new Error(error || "Worker error"));
    });
  }

  private call(type: "ensure"|"embed", payload: any): Promise<any> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });
    });
  }

  ensure(pref: "auto"|"remote") { return this.call("ensure", { pref }); }
  embed(pref: "auto"|"remote", texts: string[]) { return this.call("embed", { pref, texts }); }
}
