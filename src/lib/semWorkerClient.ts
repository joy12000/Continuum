// src/lib/semWorkerClient.ts
let _w: Worker | null = null;
let _seq = 0;

function getWorker(): Worker {
  if (!_w) {
    _w = new Worker(new URL('../workers/semanticWorker.ts', import.meta.url), { type: 'module' });
  }
  return _w;
}

function rpc<T = any>(type: string, payload?: any, timeoutMs = 10000): Promise<T> {
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
  try {
    await rpc('ensure', {});
    return true;
  } catch {
    return false;
  }
}

export async function embedLocal(texts: string[]): Promise<number[][]> {
  const ready = await ensureLocalReady();
  if (!ready) throw new Error('local semantic worker not ready');
  return rpc('embed', { texts }, 20000);
}

// ✅ Backward-compat shim: some code imports { SemWorkerClient }
export class SemWorkerClient {
  async ensureLocalReady() { return ensureLocalReady(); }
  async embed(texts: string[]) { return embedLocal(texts); }
  static async ensureLocalReady() { return ensureLocalReady(); }
  static async embed(texts: string[]) { return embedLocal(texts); }
}
