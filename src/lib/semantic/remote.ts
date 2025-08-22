// src/lib/semantic/remote.ts
export async function embedRemote(texts: string[], opts: { endpoint?: string, dims?: number } = {}) {
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
