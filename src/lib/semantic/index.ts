// src/lib/semantic/index.ts
import { embedHybrid } from './hybrid';
import { getEmbeddingMode } from './mode';
export * from './remote';
export * from './hybrid';
export * from './mode';

// ✅ Backward-compat facade: getSemanticAdapter()
// returns an adapter with .ensure() and .embed(texts, opts?) so old code keeps working.
export function getSemanticAdapter() {
  return {
    async ensure() { return true; }, // local readiness is lazily handled in worker on first embed
    async embed(texts: string[], opts?: { mode?: 'local-only'|'local-first'|'remote-only', dims?: number, endpoint?: string }) {
      const m = (opts && opts.mode) || getEmbeddingMode() || 'local-first';
      return embedHybrid(texts, m as any, { dims: opts?.dims, endpoint: opts?.endpoint });
    }
  };
}
