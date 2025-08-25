
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/**
 * HomeSky
 * - Fullscreen animated night sky (gradient + twinkling stars)
 * - Moon button (tap: /settings, long-press: quick panel for density/brightness)
 * - Ground silhouette + bottom tab bar (home/calendar/search/links)
 *
 * No external deps; works with Tailwind or plain CSS.
 */

type Star = {
  x: number;    // canvas px
  y: number;    // canvas px
  r: number;    // radius px (at dpr scale)
  phase: number;// 0..2π
  speed: number;// phase increment per frame
  baseAlpha: number; // 0..1 baseline
};

const LS_KEY = "nightSky.prefs.v1";

type Prefs = {
  densityMul: number;   // 0.2..2.0
  glowMul: number;      // 0.5..1.6
};

const defaultPrefs: Prefs = { densityMul: 1.0, glowMul: 1.0 };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultPrefs;
    const obj = JSON.parse(raw);
    return {
      densityMul: Number(obj.densityMul) || 1.0,
      glowMul: Number(obj.glowMul) || 1.0,
    };
  } catch { return defaultPrefs; }
}

function savePrefs(p: Prefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(p));
}

function useLongPress(onLong: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const onDown = () => {
    clear();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onLong();
    }, ms);
  };
  const onUp = () => clear();
  useEffect(() => clear, []);
  return { onPointerDown: onDown, onPointerUp: onUp, onPointerCancel: onUp, onPointerLeave: onUp };
}

export default function HomeSky() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [panelOpen, setPanelOpen] = useState(false);
  const nav = useNavigate();

  // handle moon interactions
  const longBind = useLongPress(() => setPanelOpen(v => !v));

  useEffect(() => {
    savePrefs(prefs);
    // reinit stars if density changed
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.densityMul]);

  useEffect(() => {
    init();
    window.addEventListener("resize", init);
    return () => {
      window.removeEventListener("resize", init);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function init() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2)); // clamp for perf
    const { innerWidth: w, innerHeight: h } = window;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // generate stars
    const area = canvas.width * canvas.height;
    const baseDensity = 0.000025; // tweak
    const count = Math.max(120, Math.floor(area * baseDensity * prefs.densityMul));
    const stars: Star[] = new Array(count).fill(0).map(() => {
      // bias more stars toward the top
      const y = Math.random() ** 0.8 * canvas.height * 0.92;
      return {
        x: Math.random() * canvas.width,
        y,
        r: Math.random() * (1.2 * dpr) + (0.3 * dpr),
        phase: Math.random() * Math.PI * 2,
        speed: 0.004 + Math.random() * 0.01,
        baseAlpha: 0.35 + Math.random() * 0.5,
      };
    });
    starsRef.current = stars;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }

  function drawGradient(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    // top: deep navy, bottom: blue-ish twilight
    grad.addColorStop(0, "#071a3a");
    grad.addColorStop(0.5, "#0a2348");
    grad.addColorStop(1, "#0f2f5a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const gh = Math.floor(h * 0.16);
    const y0 = h - gh;
    const grd = ctx.createLinearGradient(0, y0, 0, h);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.35, "rgba(0,0,0,0.3)");
    grd.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, y0, w, gh);

    // subtle hillside silhouette
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath();
    ctx.moveTo(0, h - gh * 0.3);
    ctx.quadraticCurveTo(w * 0.35, h - gh * 0.6, w * 0.7, h - gh * 0.25);
    ctx.quadraticCurveTo(w * 0.85, h - gh * 0.15, w, h - gh * 0.35);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  function tick() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = canvas;

    drawGradient(ctx, w, h);

    // stars
    const stars = starsRef.current;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.speed;
      const twinkle = (Math.sin(s.phase) * 0.5 + 0.5) * 0.7 + 0.3; // 0.3..1.0
      const a = Math.min(1, Math.max(0, s.baseAlpha * twinkle * prefs.glowMul));
      ctx.globalAlpha = a;
      // glow
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
      grd.addColorStop(0, "rgba(255,255,255,0.9)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
      ctx.fill();

      // core
      ctx.globalAlpha = Math.min(1, 0.8 * prefs.glowMul);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawGround(ctx, w, h);

    rafRef.current = requestAnimationFrame(tick);
  }

  return (
    <div className="relative w-full h-dvh overflow-hidden select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      {/* Moon button */}
      <button
        aria-label="Settings"
        onClick={() => nav("/settings")}
        {...longBind}
        className="absolute top-3 right-3 z-20 rounded-full w-11 h-11 flex items-center justify-center bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] backdrop-blur text-white"
        style={{ boxShadow: "0 0 16px rgba(255,255,255,.15) inset" }}
      >
        {/* crescent */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M20 12c0 4.418-3.582 8-8 8a8 8 0 01-3.5-15.2 8.5 8.5 0 1011.7 11.7A8 8 0 0120 12z" fill="white" opacity="0.9"/>
        </svg>
      </button>

      {/* Quick panel */}
      {panelOpen && (
        <div className="absolute top-16 right-3 z-30 rounded-xl bg-[rgba(10,15,30,0.9)] text-white p-3 w-64 shadow-lg border border-white/10">
          <div className="text-sm mb-2 opacity-90">빠른 설정</div>
          <label className="block text-xs opacity-80">별 밀도</label>
          <input
            type="range" min={0.2} max={2.0} step={0.1} value={prefs.densityMul}
            onChange={(e) => setPrefs(p => ({ ...p, densityMul: Number(e.target.value) }))}
            className="w-full mb-2"
          />
          <label className="block text-xs opacity-80">별 밝기</label>
          <input
            type="range" min={0.5} max={1.6} step={0.05} value={prefs.glowMul}
            onChange={(e) => { const v = Number(e.target.value); setPrefs(p => { const q = { ...p, glowMul: v }; savePrefs(q); return q; }); }}
            className="w-full"
          />
        </div>
      )}

      {/* Bottom tab bar on ground */}
      <nav
        className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-3 z-20 flex items-center gap-6 rounded-2xl px-4 py-2"
        style={{ background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.08)" }}
      >
        <Link to="/" className="text-white/90 hover:text-white flex items-center gap-1">
          <span aria-hidden>🏠</span><span className="hidden sm:inline text-sm">Home</span>
        </Link>
        <Link to="/calendar" className="text-white/90 hover:text-white flex items-center gap-1">
          <span aria-hidden>📅</span><span className="hidden sm:inline text-sm">Calendar</span>
        </Link>
        <Link to="/search" className="text-white/90 hover:text-white flex items-center gap-1">
          <span aria-hidden>🔎</span><span className="hidden sm:inline text-sm">Search</span>
        </Link>
        <Link to="/links" className="text-white/90 hover:text-white flex items-center gap-1">
          <span aria-hidden>🪢</span><span className="hidden sm:inline text-sm">Links</span>
        </Link>
      </nav>
    </div>
  );
}
