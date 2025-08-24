// src/lib/semWorkerClient.ts
let _w: Worker | null = null;
let _seq = 0;

function getWorker(): Worker {
  if (!_w) {
    _w = new Worker(new URL('../workers/semanticWorker.ts', import.meta.url), { type: 'module' });
  }
  return _w;
}

function rpc<T = any>(type: string, payload?: any, timeoutMs = 25000): Promise<T> {
  const w = getWorker();
  const id = ++_seq;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`semantic worker timeout: ${type}`)), timeoutMs);
    const onMsg = (ev: MessageEvent) => {
      const d = ev.data || {};
      if (d.id !== id) return;
      w.removeEventListener('message', onMsg);
      clearTimeout(t);
      if (d.ok) resolve(d.result as T);
      else reject(new Error(d.error || 'semantic worker error'));
    };
    w.addEventListener('message', onMsg);
    w.postMessage({ id, type, payload });
  });
}

export async function ensureLocalReady(): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    try { await rpc('ensure', {}, 30000); return true; } catch { await new Promise(r => setTimeout(r, 500 * (i + 1))); }
  }
  return false;
}

export async function embedLocal(texts: string[] | string, _opts?: any): Promise<number[][]> {
  const arr = Array.isArray(texts) ? texts : [texts];
  const ready = await ensureLocalReady();
  if (!ready) throw new Error('local semantic worker not ready');
  return rpc('embed', { texts: arr }, 60000);
}

export async function findSimilar(text: string, topK: number): Promise<any> {
    return rpc('SIMILAR', { text, topK });
}

// ✅ Backward-compat shim
export class SemWorkerClient {
  async ensure(_?: any) { return ensureLocalReady(); }
  async ensureReady(_?: any) { return ensureLocalReady(); }
  async ensureLocalReady() { return ensureLocalReady(); }
  async embed(texts: string[] | string, opts?: any) { return embedLocal(texts, opts); }
  async similar(text: string, topK: number) { return findSimilar(text, topK); }
  static async ensure(_?: any) { return ensureLocalReady(); }
  static async ensureReady(_?: any) { return ensureLocalReady(); }
  static async ensureLocalReady() { return ensureLocalReady(); }
  static async embed(texts: string[] | string, opts?: any) { return embedLocal(texts, opts); }
  static async similar(text: string, topK: number) { return findSimilar(text, topK); }
}
