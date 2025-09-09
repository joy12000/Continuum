import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toasts } from "../components/Toasts";
import { toast } from "../lib/toast";
import SkyCanvasAnimation from "../components/SkyCanvasAnimation";
import Moon from "../components/Moon";

// Type definitions
type QuickPrefs = {
  starDensity: number;
  starBrightness: number;
};

const DEFAULT_PREFS: QuickPrefs = {
  starDensity: 1.0,
  starBrightness: 1.0,
};

interface HomeSkyProps {
  answerSignal?: number;
  onOpenAnswer?: () => void;
}

// Main Component
export default function HomeSky({ answerSignal, onOpenAnswer }: HomeSkyProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null); // Ref for meteor container
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
  const [showAnswerStar, setShowAnswerStar] = useState(false);

  useEffect(() => {
    if (answerSignal && answerSignal > 0) {
      setShowAnswerStar(true);
    }
  }, [answerSignal]);

  // Save prefs to localStorage
  useEffect(() => {
    localStorage.setItem("sky.prefs", JSON.stringify(prefs));
  }, [prefs]);

  // Listen for paste event from other pages (e.g., Calendar)
  useEffect(() => {
    const handlePaste = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.text === 'string') {
        setDraft(detail.text);
        editorRef.current?.focus();
      }
    };

    window.addEventListener('sky:paste', handlePaste);
    return () => {
      window.removeEventListener('sky:paste', handlePaste);
    };
  }, []); // Empty dependency array ensures this runs only once

  // Sync editor with draft state
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== draft) {
      editorRef.current.innerText = draft;
    }
  }, [draft]);

  // Shooting star animation function
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
    window.dispatchEvent(new CustomEvent("sky:save", { detail: payload }));
    setDraft("");
    if (editorRef.current) editorRef.current.innerText = "";
    toast.success("저장했어요 ✨");
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) setTimeout(spawnClassicMeteor, i * 350);
  };

  return (
    <div ref={containerRef} className="relative h-dvh w-full overflow-hidden text-white">
      <Toasts />
      <SkyCanvasAnimation prefs={prefs} />
      {/* 상단 비네트: 여백 축소 & 배경 밴딩 억제 */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(120% 70% at 75% 0%, rgba(5,18,40,0.42), rgba(5,18,40,0) 55%)",
        }}
      />

      {/* 달 */}
      <Moon onClick={() => navigate("/settings")} />

      <div className="absolute top-3 left-3 z-30">
        <button className="sky-constellation" onClick={handleSave} aria-label="저장">
          <span className="star s1" /><span className="star s2" /><span className="star s3" /><span className="star s4" />
        </button>
      </div>

      <div className="absolute right-16 md:right-20 top-1 md:top-2 z-30 flex items-center gap-2">
        {/* {answerSignal && answerSignal > 0 && (
          <button
            className="p-2 rounded-full hover:scale-105 transition-transform animate-pulse"
            onClick={() => {
              onOpenAnswer?.();
            }}
            aria-label="답변 보기"
          >
            <AnswerStarSVG />
          </button>
        )} */}
      </div>

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
      />

      {!draft && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-6 md:px-12 text-center" style={{ fontSize: "clamp(18px, 3.4vw, 28px)", lineHeight: 1.6, color: "rgba(220,235,255,0.42)", textShadow: "0 0 0.7rem rgba(150,190,255,0.2)" }}>
          밤하늘에 오늘을 적어 보세요…
        </div>
      )}

      {showQuick && (
        <div id="quick-panel" className="absolute right-3 top-16 z-40 w-[260px] rounded-2xl border border-white/10 bg-[#0b1830]/80 p-3 backdrop-blur">
          <h3 className="mb-2 text-sm text-white/80">빠른 설정</h3>
          <Slider label="별 밀도" min={0.2} max={2} step={0.05} value={prefs.starDensity} onChange={(v) => setPrefs((p) => ({ ...p, starDensity: v }))} />
          <Slider label="별 밝기" min={0.5} max={1.5} step={0.05} value={prefs.starBrightness} onChange={(v) => setPrefs((p) => ({ ...p, starBrightness: v }))} />
        </div>
      )}
    </div>
  );
}

// Helper Components
function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; }) {
  return (
    <label className="mb-3 block text-xs text-white/70">
      <span className="mb-1 block">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-sky-300" />
      <div className="mt-0.5 text-right text-[11px] text-white/50">{value.toFixed(2)}</div>
    </label>
  );
}

function AnswerStarSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="url(#answer-gradient)" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="answer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#fde047', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: '#f97316', stopOpacity: 1}} />
        </linearGradient>
      </defs>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function CrescentMoonSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="moonGlow" cx="50%" cy="45%" r="55%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" /><stop offset="60%" stopColor="#dbe7ff" stopOpacity="0.85" /><stop offset="100%" stopColor="#c0d6ff" stopOpacity="0.55" /></radialGradient>
        <mask id="crescentMask"><rect width="100%" height="100%" fill="black" /><circle cx="34" cy="30" r="18" fill="white" /><circle cx="42" cy="26" r="16" fill="black" /></mask>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <g filter="url(#softGlow)"><circle cx="34" cy="30" r="20" fill="url(#moonGlow)" mask="url(#crescentMask)" /></g>
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
