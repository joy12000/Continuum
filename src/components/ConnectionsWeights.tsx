import React, { useEffect, useState } from 'react';
export type Weights = { citation: number; sim: number; tag: number };
function useLocal<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV] as const;
}
export function ConnectionsWeights({ value, onChange, storageKey='conn-weights' }:{ value?: Weights; onChange?: (w:Weights)=>void; storageKey?:string }) {
  const [w, setW] = useLocal<Weights>(storageKey, value ?? { citation:1, sim:0.6, tag:0.2 });
  useEffect(() => { onChange?.(w); }, [w]);
  return (
    <div className="rounded-lg border p-3 text-sm space-y-2">
      <div className="font-medium">연결 가중치</div>
      {(['citation','sim','tag'] as const).map(k => (
        <label key={k} className="flex items-center gap-2">
          <span className="w-16">{k}</span>
          <input type="range" min={0} max={2} step={0.1} value={(w as any)[k]}
                 onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} className="flex-1" />
          <span className="tabular-nums w-10 text-right">{(w as any)[k].toFixed(1)}</span>
        </label>
      ))}
    </div>
  );
}
