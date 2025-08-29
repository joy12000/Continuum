import React, { useEffect, useRef } from 'react';
type Node = { id: string; title?: string };
type Link = { source: string; target: string; weight?: number };
type SimNode = { id: string; x: number; y: number; vx: number; vy: number; fixed?: boolean; };
function initPositions(nodes: Node[], w: number, h: number): Map<string, SimNode> {
  const map = new Map<string, SimNode>();
  for (let i=0;i<nodes.length;i++) {
    const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
    map.set(nodes[i].id, { id: nodes[i].id, x: w/2 + Math.cos(a)*Math.min(w,h)/4, y: h/2 + Math.sin(a)*Math.min(w,h)/4, vx:0, vy:0 });
  }
  return map;
}

interface ConnectionsGraphProps {
  nodes: Node[];
  links: Link[];
  onSelect?: (id: string) => void;
  height?: number;
  nodeColor?: string;
  linkColor?: string;
}

export function ConnectionsGraph({ 
  nodes, 
  links, 
  onSelect, 
  height = 380, 
  nodeColor = '#e0f2fe', // sky-100
  linkColor = 'rgba(125, 211, 252, 0.4)' // sky-300 with alpha
}: ConnectionsGraphProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * ratio, h = canvas.clientHeight * ratio;
    canvas.width = w; canvas.height = h; ctx.scale(ratio, ratio);
    const map = initPositions(nodes, canvas.clientWidth, canvas.clientHeight);
    const params = { centerK: 0.01, springK: 0.05, linkLen: 90, repelK: 4000, damping: 0.85 };
    function step() {
      const arr = Array.from(map.values());
      for (const n of arr) { n.vx += (canvas.clientWidth/2 - n.x) * params.centerK; n.vy += (canvas.clientHeight/2 - n.y) * params.centerK; }
      for (const e of links) {
        const a = map.get(e.source); const b = map.get(e.target); if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y; const dist = Math.max(1, Math.hypot(dx, dy));
        const k = params.springK * (e.weight ? Math.min(2, Math.max(0.2, e.weight)) : 1);
        const f = k * (dist - params.linkLen); const fx = (dx / dist) * f; const fy = (dy / dist) * f; a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
      for (let i=0, arr=Array.from(map.values()); i<arr.length; i++) for (let j=i+1; j<arr.length; j++) {
        const a = arr[i], b = arr[j]; const dx = b.x - a.x, dy = b.y - a.y; const d2 = Math.max(25, dx*dx + dy*dy);
        const f = params.repelK / d2; const dist = Math.sqrt(d2); const fx = (dx / dist) * f; const fy = (dy / dist) * f; a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
      }
      for (const n of map.values()) { n.vx *= params.damping; n.vy *= params.damping; n.x += n.vx * 0.02; n.y += n.vy * 0.02; }
    }
    function draw() {
      ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
      ctx.save();
      ctx.strokeStyle = linkColor;
      ctx.globalAlpha = 0.7;
      for (const e of links) {
        const a = map.get(e.source); const b = map.get(e.target); if (!a || !b) continue;
        ctx.lineWidth = Math.max(0.5, (e.weight || 1) * 1.2);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = nodeColor;
      ctx.shadowColor = 'rgba(125, 211, 252, 0.8)';
      ctx.shadowBlur = 8;
      for (const n of map.values()) { ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    let raf = 0; (function loop() { step(); draw(); raf = requestAnimationFrame(loop); })();
    function onClick(ev: MouseEvent) {
      const r = canvas.getBoundingClientRect(); const x = ev.clientX - r.left; const y = ev.clientY - r.top;
      let hit: string | null = null;
      for (const n of map.values()) { if (Math.hypot(n.x - x, n.y - y) < 10) { hit = n.id; break; } }
      if (hit && onSelect) onSelect(hit);
    }
    canvas.addEventListener('click', onClick);
    return () => { cancelAnimationFrame(raf); canvas.removeEventListener('click', onClick); };
  }, [nodes, links, onSelect, nodeColor, linkColor]);
  return <div className="rounded-lg bg-black/20 border border-white/10 p-2"><canvas ref={ref} style={{ width: '100%', height }} /></div>;
}