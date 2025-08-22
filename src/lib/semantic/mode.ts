// src/lib/semantic/mode.ts
export type HybridMode = 'local-only' | 'local-first' | 'remote-only';
const KEY = 'embeddingMode:v1';
export function getEmbeddingMode(): HybridMode {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return (v === 'local-only' || v === 'remote-only' || v === 'local-first') ? v : 'local-first';
}
export function setEmbeddingMode(m: HybridMode) { try { localStorage.setItem(KEY, m); } catch {} }
