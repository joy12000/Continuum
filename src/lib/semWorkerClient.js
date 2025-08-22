export class SemWorkerClient {
    worker;
    pending = new Map();
    constructor() {
        this.worker = new Worker(new URL("../workers/semanticWorker.ts?worker", import.meta.url), { type: "module" });
        this.worker.addEventListener("message", (e) => {
            const { id, ok, result, error } = e.data || {};
            const p = this.pending.get(id);
            if (!p)
                return;
            this.pending.delete(id);
            ok ? p.resolve(result) : p.reject(new Error(error || "Worker error"));
        });
    }
    call(type, payload) {
        const id = crypto.randomUUID();
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.worker.postMessage({ id, type, payload });
        });
    }
    ensure(pref) { return this.call("ensure", { pref }); }
    embed(pref, texts) { return this.call("embed", { pref, texts }); }
}
