import React, { useEffect, useRef, useState } from 'react';

export type DailySummary = {
  title: string;
  summary: string;
  bullets: string[];
  tomorrow?: string;
  tags?: string[];
};

type Props = {
  onOpenSettings: () => void;
  onOpenEditor: () => void;
  onOpenSummary: () => void;
  latestSummary?: DailySummary | null;
  bottomBarSelector?: string; // e.g., '#tabbar'
};

/**
 * Night sky with starfield.
 * - Click anywhere -> open editor (unless clicking the moon or bottom bar)
 * - When latestSummary changes, a random star "celebrates" (sparkle) for ~8s
 * - Clicking the celebrating star opens the summary modal
 * - Prefers-reduced-motion respected (static stars)
 * - Safe-area insets respected for moon position
 */
export default function HomeSky({ onOpenSettings, onOpenEditor, onOpenSummary, latestSummary, bottomBarSelector }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const moonRef = useRef<HTMLButtonElement | null>(null);

  type Star = { id:number; x:number; y:number; r:number; tw:number; phase:number };
  const starsRef = useRef<Star[]>([]);
  const [celebrateId, setCelebrateId] = useState<number | null>(null);
  const celebrateUntilRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, (window.devicePixelRatio || 1)));
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0;
    let raf = 0;

    const resize = () => {
      if (!canvas.parentElement) return;
      w = canvas.parentElement.clientWidth;
      h = canvas.parentElement.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
    };

    const initStars = () => {
      const area = w * h;
      const count = Math.max(60, Math.min(320, Math.floor(area / 6500)));
      const arr: Star[] = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          id: i + 1,
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.4 + 0.3,
          tw: Math.random() * 1.2 + 0.4,
          phase: Math.random() * Math.PI * 2,
        });
      }
      starsRef.current = arr;
    };

    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 1000 / 30) return;
      last = t;

      try {
        ctx.clearRect(0, 0, w, h);
        const cid = celebrateId;
        const now = performance.now();

        for (const s of starsRef.current) {
          let alpha = 0.85;
          if (!prefersReduced) {
            alpha = 0.55 + 0.45 * Math.sin(s.phase + t / 1000 * s.tw);
          }

          let rr = s.r;
          if (cid && s.id === cid && now < celebrateUntilRef.current) {
            rr = s.r + 0.8 + 0.4 * Math.sin(t / 160);
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(s.x, s.y, rr * 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(170,200,255,0.45)';
            ctx.fill();
            ctx.restore();
          }

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(s.x, s.y, rr, 0, Math.PI * 2);
          ctx.fillStyle = '#cfe3ff';
          ctx.fill();
          ctx.restore();
        }
      } catch (error) {
        console.error("Error in canvas draw loop:", error);
        cancelAnimationFrame(raf);
      }
    };

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) {
      ro.observe(canvas.parentElement);
    }

    resize();
    raf = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [celebrateId]);

  // pick a random celebration star when a new summary arrives
  const lastSummaryRef = useRef<string>('');
  useEffect(() => {
    const key = latestSummary ? (latestSummary.title + '|' + (latestSummary.summary||'')).slice(0,120) : '';
    if (!latestSummary || key === lastSummaryRef.current) return;
    lastSummaryRef.current = key;

    const stars = starsRef.current;
    if (!stars.length) return;
    const marginX = 32, marginY = 48;
    const safe = stars.filter(s => s.x > marginX && s.y > marginY);
    const chosen = (safe.length ? safe : stars)[Math.floor(Math.random() * (safe.length ? safe.length : stars.length))];
    setCelebrateId(chosen.id);
    celebrateUntilRef.current = performance.now() + 8000; // ~8s
    const clearTimer = setTimeout(() => setCelebrateId(null), 8200);
    return () => clearTimeout(clearTimer);
  }, [latestSummary]);

  function tryHitCelebrationStar(evt: React.MouseEvent): boolean {
    if (!celebrateId) return false;
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const star = starsRef.current.find(s => s.id === celebrateId);
    if (!star) return false;
    const dx = x - star.x, dy = y - star.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const hitRadius = Math.max(16, star.r * 6); // generous for touch
    return dist <= hitRadius;
  }

  function onContainerClick(e: React.MouseEvent) {
    const moonEl = moonRef.current;
    if (moonEl && (e.target instanceof Node) && moonEl.contains(e.target as Node)) {
      return;
    }
    if (bottomBarSelector) {
      const bar = document.querySelector(bottomBarSelector);
      if (bar && (e.target instanceof Node) && bar.contains(e.target as Node)) {
        return;
      }
    }
    if (tryHitCelebrationStar(e)) {
      onOpenSummary();
      return;
    }
    onOpenEditor();
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Night sky"
      className="fixed inset-0 select-none"
      onClick={onContainerClick}
      style={{
        backgroundImage: [
          'radial-gradient(1200px 60% at 70% -10%, rgba(80,120,255,0.15), rgba(0,0,0,0))',
          'radial-gradient(800px 50% at 30% 20%, rgba(140,170,255,0.10), rgba(0,0,0,0))',
          'linear-gradient(180deg, #0A1640 0%, #081234 50%, #060e2a 100%)'
        ].join(','),
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover'
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <button
        ref={moonRef}
        onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
        aria-label="설정 열기"
        className="absolute rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300/70"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          width: '56px',
          height: '56px',
          background: 'radial-gradient(40% 40% at 35% 35%, rgba(255,255,255,0.95) 0%, rgba(240,246,255,0.85) 40%, rgba(210,225,255,0.75) 65%, rgba(180,200,255,0.60) 85%, rgba(150,175,245,0.35) 100%)',
          boxShadow: '0 0 20px rgba(150,180,255,0.55), 0 0 50px rgba(120,160,255,0.25)',
        }}
      >
        <span className="sr-only">Settings</span>
      </button>
    </div>
  );
}
