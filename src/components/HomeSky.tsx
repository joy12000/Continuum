'use client';
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { CHAT_BUNDLE_EVENT } from "../lib/events";

// Type definitions
type QuickPrefs = {
  starDensity: number;
  starBrightness: number;
};

const DEFAULT_PREFS: QuickPrefs = {
  starDensity: 1.0,
  starBrightness: 1.0,
};

// Main Component
export default function HomeSky({ answerSignal, onOpenAnswer }: { answerSignal?: number; onOpenAnswer?: () => void }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [prefs, setPrefs] = useState<QuickPrefs>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    try {
      const saved = localStorage.getItem("sky.prefs");
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const [draft, setDraft] = useState<string>("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [showQuick, setShowQuick] = useState(false);
  const [showAnswerStar, setShowAnswerStar] = useState(false);
  const starsRef = useRef<{ x: number; y: number; r: number; tw: number }[]>([]);

  const dpr = typeof window !== 'undefined' ? Math.max(1, Math.min(2, window.devicePixelRatio || 1)) : 1;

  useEffect(() => {
    if (answerSignal && answerSignal > 0) {
      setShowAnswerStar(true);
    }
  }, [answerSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars();
    };

    const seedStars = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const base = Math.round((w * h) / 9000);
      const count = Math.max(100, Math.floor(base * prefs.starDensity));
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [prefs.starDensity, dpr]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const render = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#071739");
      g.addColorStop(0.45, "#09224a");
      g.addColorStop(1, "#0a2c50");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.globalAlpha = 0.08;
      for (let i = 0; i < 2; i++) {
        const rg = ctx.createRadialGradient(w*(0.2+0.6*Math.random()),h*(0.25+0.3*Math.random()),0,w*0.5,h*0.5,Math.max(w,h)*(0.8+Math.random()*0.4));
        rg.addColorStop(0, "rgba(255,255,255,0.03)");
        rg.addColorStop(1, "rgba(255,255,255,0.0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;

      const stars = starsRef.current;
      for (const s of stars) {
        s.tw += 0.015 + (s.x % 7) * 0.0005;
        const twinkle = (Math.sin(s.tw) + 1) * 0.5;
        const a = (0.35 + 0.65 * twinkle) * prefs.starBrightness;
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, a)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.9 + twinkle * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }

      const groundH = Math.max(36, Math.min(120, h * 0.12));
      const gg = ctx.createLinearGradient(0, h - groundH, 0, h);
      gg.addColorStop(0, "rgba(0,0,0,0.0)");
      gg.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = gg;
      ctx.fillRect(0, h - groundH, w, groundH);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [prefs.starBrightness, dpr]);

  useEffect(() => {
    const onSkyClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (document.getElementById("quick-panel")?.contains(target)) return;
      if (document.getElementById("save-button")?.contains(target)) return;
      editorRef.current?.focus();
    };
    window.addEventListener("click", onSkyClick);
    return () => window.removeEventListener("click", onSkyClick);
  }, []);

  useEffect(() => {
    localStorage.setItem("sky.prefs", JSON.stringify(prefs));
  }, [prefs]);

  function spawnClassicMeteor() {
    const host = containerRef.current;
    if (!host) return;
    const h = host.clientHeight;
    const startY = Math.max(0.25 * h, Math.min(0.6 * h, (0.4 * h) + (Math.random() - 0.5) * 0.25 * h));
    const el = document.createElement("div");
    el.className = "meteor-classic";
    el.style.top = `${startY}px`;
    el.style.left = `-120px`;
    el.style.animationDuration = `${3.0 + Math.random() * 1.3}s`;
    host.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setDraft((e.target as HTMLDivElement).innerText);
  };
  const handleSave = () => {
    if (!draft || !draft.trim()) return;
    const payload = { text: draft, createdAt: Date.now() };
    window.dispatchEvent(new CustomEvent(CHAT_BUNDLE_EVENT, { detail: payload }));
    setDraft("");
    if (editorRef.current) editorRef.current.innerText = "";
    toast.success("기억이 별빛이 되어 저장되었습니다.");
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) setTimeout(spawnClassicMeteor, i * 350);
  };

  return (
    <div ref={containerRef} className="relative h-dvh w-full overflow-hidden text-white">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      <div className="absolute top-3 left-3 z-30">
        <button id="save-button" className="sky-constellation" onClick={handleSave} aria-label="기록 저장하기">
          <span className="star s1" /><span className="star s2" /><span className="star s3" /><span className="star s4" />
        </button>
      </div>

      <div
        ref={editorRef}
        role="textbox"
        aria-label="노트 작성 공간"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="absolute inset-0 z-10 px-6 md:px-12 outline-none focus:outline-none select-text flex items-center justify-center"
        onInput={handleInput}
        data-placeholder="떠오르는 생각을 적어주세요. 당신의 지식은 연결됩니다."
        style={{
          fontFamily: "'Pretendard Variable', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans KR, Apple SD Gothic Neo, sans-serif",
          fontWeight: 500,
          fontSize: "clamp(18px, 3.4vw, 28px)",
          lineHeight: 1.6,
          textAlign: "center",
          color: "rgba(235,243,255,0.92)",
          textShadow: "0 0 0.4rem rgba(180,210,255,0.65), 0 0 1.2rem rgba(140,190,255,0.35)",
          mixBlendMode: "screen",
        }}
      />

      {!draft && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-6 md:px-12 text-center" style={{ fontSize: "clamp(18px, 3.4vw, 28px)", lineHeight: 1.6, color: "rgba(220,235,255,0.42)", textShadow: "0 0 0.7rem rgba(150,190,255,0.2)" }}>
          떠오르는 생각을 적어주세요. 당신의 지식은 연결됩니다.
        </div>
      )}

      {showQuick && (
        <div id="quick-panel" className="absolute right-3 top-16 z-40 w-[260px] rounded-2xl border border-white/10 bg-[#0b1830]/80 p-3 backdrop-blur">
          <h3 className="mb-2 text-sm text-white/80">이미지 설정</h3>
          <Slider label="별 밀도" min={0.2} max={2} step={0.05} value={prefs.starDensity} onChange={(v) => setPrefs((p) => ({ ...p, starDensity: v }))} />
          <Slider label="별 밝기" min={0.5} max={1.5} step={0.05} value={prefs.starBrightness} onChange={(v) => setPrefs((p) => ({ ...p, starBrightness: v }))} />
        </div>
      )}
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; }) {
  return (
    <label className="mb-3 block text-xs text-white/70">
      <span className="mb-1 block">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-sky-300" />
      <div className="mt-0.5 text-right text-[11px] text-white/50">{value.toFixed(2)}</div>
    </label>
  );
}
