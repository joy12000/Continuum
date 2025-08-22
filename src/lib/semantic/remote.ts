// src/lib/semantic/remote.ts
export interface RemoteOptions {
  endpoint?: string;
  dims?: number;
}

export async function embedRemote(texts: string[], opts: RemoteOptions = {}) {
  const endpoint = opts.endpoint || '/api/embed';
  const body = JSON.stringify({
    texts,
    ...(opts.dims ? { output_dimensionality: opts.dims } : {}),
  });
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  if (!r.ok) {
    const t = await r.text().catch(()=>''); 
    throw new Error(`remote ${endpoint} ${r.status}: ${t || r.statusText}`);
  }
  const j = await r.json();
  return (j.vectors || []) as number[][];
}

// Backward-compat class
export class RemoteAdapter {
  endpoint: string;
  dims?: number;
  constructor(opts: RemoteOptions = {}) {
    this.endpoint = opts.endpoint || '/api/embed';
    this.dims = opts.dims;
  }
  async embed(texts: string[]) {
    return embedRemote(texts, { endpoint: this.endpoint, dims: this.dims });
  }
}
