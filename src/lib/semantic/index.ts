// src/lib/semantic/index.ts
import { embedHybrid } from './hybrid';
import { getEmbeddingMode } from './mode';
import type { HybridMode } from './mode';

export { embedRemote, RemoteAdapter } from './remote';
export { embedHybrid } from './hybrid';
export { getEmbeddingMode, setEmbeddingMode } from './mode';
export type { HybridMode } from './mode';

// ✅ Backward-compat facade: accept any args to match old signatures
export function getSemanticAdapter(..._args: any[]) {
  return {
    async ensure(_?: any) { return true; },
    async ensureReady(_?: any) { return true; },
    async embed(texts: string[] | string, opts?: { mode?: HybridMode, dims?: number, endpoint?: string }) {
      const arr = Array.isArray(texts) ? texts : [texts];
      const m = (opts && opts.mode) || getEmbeddingMode() || 'local-first';
      return embedHybrid(arr, m, { dims: opts?.dims, endpoint: opts?.endpoint });
    }
  };
}
