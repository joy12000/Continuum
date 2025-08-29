import React from 'react';
type Neighbor = { toId: string; score: number; reasons: string[]; title?: string };
export function ConnectionsPanel({ neighbors, onSelect }: { neighbors: Neighbor[]; onSelect: (id: string) => void }) {
  if (!neighbors?.length) return null;
  return (
    <div className="rounded-lg border p-2 text-sm">
      <div className="mb-1 font-medium">연결된 노트</div>
      <ul className="space-y-1">
        {neighbors.map((n) => (
          <li key={n.toId} className="flex items-start justify-between gap-2">
            <button onClick={() => onSelect(n.toId)} className="text-left hover:underline" title={n.title || n.toId}>
              {n.title || n.toId}
            </button>
            <div className="shrink-0 tabular-nums text-[11px] text-neutral-500">{n.score.toFixed(2)}</div>
            <div className="shrink-0 text-[10px] text-neutral-500/80 truncate">{n.reasons.join(', ')}</div>
          </li>
        ))}
      </ul>
      <div className="mt-2 text-[11px] text-neutral-500">표기 예: cit=인용, sim=코사인, tag=태그</div>
    </div>
  );
}
