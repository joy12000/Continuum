// src/lib/semantic/hybrid.ts
import { embedLocal } from '../semWorkerClient';
import { embedRemote } from './remote';
import { getEmbeddingMode } from './mode';
import type { HybridMode } from './mode';

const CACHE_PREFIX = 'emb:v1:';
type V = number[];

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function putCache(key: string, vec: V) { try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(vec)); } catch {} }
function getCache(key: string): V | null { try { const s = localStorage.getItem(CACHE_PREFIX + key); return s ? JSON.parse(s) : null; } catch { return null; } }

export async function embedHybrid(texts: string[], mode?: HybridMode, opts: { dims?: number, endpoint?: string } = {}) {
  const useMode = mode || getEmbeddingMode() || 'local-first';
  const keys = await Promise.all(texts.map(t => sha256(t)));
  const cached: (V | null)[] = keys.map(k => getCache(k));
  const needIdx: number[] = []; texts.forEach((_, i) => { if (!cached[i]) needIdx.push(i); });
  const out: V[] = texts.map((_, i) => cached[i] || [] as any);

  async function tryLocal(missingIdx: number[]) {
    const payload = missingIdx.map(i => texts[i]);
    const vecs = await embedLocal(payload);
    missingIdx.forEach((i, j) => { out[i] = vecs[j]; putCache(keys[i], out[i]); });
  }
  async function tryRemote(missingIdx: number[]) {
    const payload = missingIdx.map(i => texts[i]);
    const vecs = await embedRemote(payload, { endpoint: opts.endpoint, dims: opts.dims || 768 });
    missingIdx.forEach((i, j) => { out[i] = vecs[j]; putCache(keys[i], out[i]); });
  }

  if (useMode === 'local-only') { if (needIdx.length) await tryLocal(needIdx); return out; }
  if (useMode === 'remote-only') { if (needIdx.length) await tryRemote(needIdx); return out; }

  try { if (needIdx.length) await tryLocal(needIdx); }
  catch { const still = texts.map((_, i) => (!out[i] || out[i].length === 0) ? i : -1).filter(i => i >= 0); if (still.length) await tryRemote(still); }
  return out;
}
