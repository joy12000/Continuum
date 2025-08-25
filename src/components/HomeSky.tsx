import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import Toast from "./Toast";
import Modal from "./Modal";
import "../styles/toast.css";
import "../styles/modal.css";
import "../styles/sky.css";

type QuickPrefs = {
  starDensity: number; // 0.2 ~ 2.0
  starBrightness: number; // 0.5 ~ 1.5
};

const DEFAULT_PREFS: QuickPrefs = {
  starDensity: 1.0,
  starBrightness: 1.0,
};

const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

export default function HomeSky(props: {
  onSave?: (payload: { text: string; createdAt: number }) => void;
}) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null); // For effects
  const rafRef = useRef<number | null>(null);
  const [prefs, setPrefs] = useState<QuickPrefs>(() => {
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
  const longPressTimer = useRef<number | null>(null);
  const moonRef = useRef<HTMLButtonElement | null>(null);
  const starsRef = useRef<{ x: number; y: number; r: number; tw: number }[]>([]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [modal, setModal] = useState<{ title: string; summary: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
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
  }, [prefs.starDensity]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const render = (t: number) => {
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
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.tw += 0.015 + (i % 7) * 0.0005;
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
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefs.starBrightness]);

  useEffect(() => {
    const onSkyClick = (e: MouseEvent) => {
      const moonEl = moonRef.current;
      if (moonEl && moonEl.contains(e.target as Node)) return;
      const quick = document.getElementById("quick-panel");
      if (quick && quick.contains(e.target as Node)) return;
      editorRef.current?.focus();
    };
    window.addEventListener("click", onSkyClick);
    return () => window.removeEventListener("click", onSkyClick);
  }, []);

  useEffect(() => {
    localStorage.setItem("sky.prefs", JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  useEffect(() => {
    (window as any).skyNotifySummary = ({ title, text }: { title: string; text: string }) => {
      spawnTwinkleStar(title, text);
    };
  }, []);

  function handleSave() {
    const text = editorRef.current?.innerText || "";
    const payload = { text, createdAt: Date.now() };
    if (props.onSave) props.onSave(payload);
    else window.dispatchEvent(new CustomEvent("sky:save", { detail: payload }));
    setToast({ message: "저장했어요 ✨", type: 'success' });
    setTimeout(() => setToast(null), 1800);
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) setTimeout(spawnClassicMeteor, i * 350);
  }

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

  function spawnTwinkleStar(title: string, summary: string) {
    const host = containerRef.current;
    if (!host) return;
    const w = host.clientWidth, h = host.clientHeight;
    const star = document.createElement("button");
    star.className = "twinkle-star";
    star.style.left = `${0.15 * w + Math.random() * 0.7 * w}px`;
    star.style.top  = `${0.18 * h + Math.random() * 0.5 * h}px`;
    star.title = "요약 보기";
    star.addEventListener("click", () => {
      setModal({ title, summary });
      star.remove();
    });
    host.appendChild(star);
    requestAnimationFrame(() => star.classList.add("twinkle-on"));
  }

  const onMoonPointerDown = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setShowQuick((s) => !s);
    }, 520);
  };

  const onMoonPointerUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onMoonClick = () => {
    if (showQuick) return;
    navigate("/settings");
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setDraft((e.target as HTMLDivElement).innerText);
  };

  return (
    <div ref={containerRef} className="relative h-dvh w-full overflow-hidden text-white">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      <Tippy content="설정 (길게 눌러 빠른 설정)">
        <button
          ref={moonRef}
          aria-label="Settings"
          className="absolute right-4 top-4 z-30 rounded-full p-2 hover:scale-105 transition-transform"
          onClick={onMoonClick}
          onPointerDown={onMoonPointerDown}
          onPointerUp={onMoonPointerUp}
          onPointerCancel={onMoonPointerUp}>
          <CrescentMoonSVG />
        </button>
      </Tippy>

      <Tippy content="저장 (Cmd+S)">
        <button 
          className="absolute right-16 top-4 z-30 p-2 hover:scale-105 transition-transform"
          onClick={handleSave} 
          aria-label="저장">
          <ConstellationSaveSVG />
        </button>
      </Tippy>

      <div
        ref={editorRef}
        role="textbox"
        aria-label="밤하늘 메모"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="absolute inset-0 z-10 px-6 md:px-12 outline-none focus:outline-none select-text flex items-center justify-center"
        onInput={handleInput}
        data-placeholder="밤하늘에 오늘을 적어 보세요…"
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
      ></div>

      {!draft && (
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-6 md:px-12 text-center"
          style={{
            fontSize: "clamp(18px, 3.4vw, 28px)",
            lineHeight: 1.6,
            color: "rgba(220,235,255,0.42)",
            textShadow: "0 0 0.7rem rgba(150,190,255,0.2)",
          }}>
          밤하늘에 오늘을 적어 보세요…
        </div>
      )}

      {showQuick && (
        <div
          id="quick-panel"
          className="absolute right-3 top-16 z-40 w-[260px] rounded-2xl border border-white/10 bg-[#0b1830]/80 p-3 backdrop-blur">
          <h3 className="mb-2 text-sm text-white/80">빠른 설정</h3>
          <Slider label="별 밀도" min={0.2} max={2} step={0.05} value={prefs.starDensity} onChange={(v) => setPrefs((p) => ({ ...p, starDensity: v }))} />
          <Slider label="별 밝기" min={0.5} max={1.5} step={0.05} value={prefs.starBrightness} onChange={(v) => setPrefs((p) => ({ ...p, starBrightness: v }))} />
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {modal &&
        (() => {
          const modalActions = (
            <>
              <button className="btn outline" onClick={() => setModal(null)}>닫기</button>
              <button
                className="btn"
                onClick={() => {
                  if (!modal) return;
                  const currentText = editorRef.current?.innerText || "";
                  const newText = (currentText ? currentText + "\n\n" : "") + modal.summary;
                  if (editorRef.current) editorRef.current.innerText = newText;
                  setDraft(newText);
                  setModal(null);
                }}>
                본문에 붙여넣기
              </button>
            </>
          );
          return (
            <Modal
              title={modal.title}
              onClose={() => setModal(null)}
              actions={modalActions}>
              <p>{modal.summary}</p>
            </Modal>
          );
        })()
      }
    </div>
  );
}

function Slider(props: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; }) {
  return (
    <label className="mb-3 block text-xs text-white/70">
      <span className="mb-1 block">{props.label}</span>
      <input type="range" {...props} onChange={(e) => props.onChange(Number(e.target.value))} className="w-full accent-sky-300" />
      <div className="mt-0.5 text-right text-[11px] text-white/50">{props.value.toFixed(2)}</div>
    </label>
  );
}

function CrescentMoonSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="moonGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#dbe7ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#c0d6ff" stopOpacity="0.55" />
        </radialGradient>
        <mask id="crescentMask">
          <rect width="100%" height="100%" fill="black" />
          <circle cx="34" cy="30" r="18" fill="white" />
          <circle cx="42" cy="26" r="16" fill="black" />
        </mask>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#softGlow)">
        <circle cx="34" cy="30" r="20" fill="url(#moonGlow)" mask="url(#crescentMask)" />
      </g>
    </svg>
  );
}

function ConstellationSaveSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64">
      <style>{`.s{fill:rgba(255,255,255,0.8);transform-origin:center;animation:s-pulse 2s ease-in-out infinite}.s1{animation-delay:-.5s}.s2{animation-delay:-.2s}.s3{animation-delay:-.8s}.s4{animation-delay:-1.2s}@keyframes s-pulse{0%,100%{transform:scale(.9);opacity:.7}50%{transform:scale(1.05);opacity:1}}`}</style>
      <path d="M22 22.2c.3-3.3 2-6.2 4.4-8.4 3-2.8 7-4.3 11.1-4.7.8 0 1.5.2 2.3.5 4.8 1.8 8.2 5.6 9.6 10.6.8 2.8.9 5.8.3 8.7-1.2 5.4-4.4 9.8-8.9 12.8-3.8 2.5-8.3 3.6-12.8 3.2-5.2-.5-9.9-3.2-13.2-7.2C9.3 32.8 9.2 25.8 14 20c.8-1 1.8-2 2.8-2.8.8-.6 1.7-1.2 2.6-1.7" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle className="s s1" cx="22" cy="22" r="2.5" />
      <circle className="s s2" cx="37" cy="11" r="2" />
      <circle className="s s3" cx="47" cy="22" r="2.2" />
      <circle className="s s4" cx="34" cy="39" r="1.8" />
    </svg>
  );
}
