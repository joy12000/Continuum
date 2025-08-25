import React, { useEffect, useRef, useState } from "react";

type Star = {
  x: number; y: number; r: number;
  phase: number; speed: number; baseAlpha: number;
};

const LS_KEY = "nightSky.prefs.v1";

type Prefs = {
  densityMul: number;
  glowMul: number;
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

export default function SkyBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const [prefs] = useState<Prefs>(() => loadPrefs());

  useEffect(() => {
    init();
    window.addEventListener("resize", init);
    return () => {
      window.removeEventListener("resize", init);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.densityMul]);

  function init() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const { innerWidth: w, innerHeight: h } = window;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const area = canvas.width * canvas.height;
    const baseDensity = 0.000025;
    const count = Math.max(120, Math.floor(area * baseDensity * prefs.densityMul));
    const stars: Star[] = new Array(count).fill(0).map(() => {
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

    const stars = starsRef.current;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.speed;
      const twinkle = (Math.sin(s.phase) * 0.5 + 0.5) * 0.7 + 0.3;
      const a = Math.min(1, Math.max(0, s.baseAlpha * twinkle * prefs.glowMul));
      ctx.globalAlpha = a;
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
      grd.addColorStop(0, "rgba(255,255,255,0.9)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
      ctx.fill();

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
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 block w-full h-full -z-10"
    />
  );
}
