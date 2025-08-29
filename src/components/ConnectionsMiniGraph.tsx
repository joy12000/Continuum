import React, { useMemo } from "react";
export function ConnectionsMiniGraph({ selfId, neighbors }: { selfId: string; neighbors: { id: string; score: number }[] }) {
  const nodes = useMemo(() => {
    const center = { x: 32, y: 16 };
    const radius = 14;
    return neighbors.slice(0, 4).map((n, i) => {
      const angle = (i / Math.max(4, neighbors.length)) * Math.PI * 2;
      return { id: n.id, x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
    });
  }, [neighbors]);
  return (
    <svg width="64" height="32" className="text-neutral-400">
      <circle cx="32" cy="16" r="4" fill="currentColor" />
      {nodes.map((p, idx) => (
        <g key={p.id || idx}>
          <line x1="32" y1="16" x2={p.x} y2={p.y} stroke="currentColor" strokeWidth="1" />
          <circle cx={p.x} cy={p.y} r="2.5" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
