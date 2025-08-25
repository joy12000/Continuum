import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * HomeSky
 * - 풀스크린 밤하늘 배경(그라데이션 + 반짝이는 별)
 * - 우상단 달 아이콘: 탭 -> /settings 이동, 길게눌러 빠른설정(밀도/밝기)
 * - 하늘 어디서든 타이핑하면 "은은한 달빛" 스타일로 글씨가 바로 써짐
 *   (contentEditable 오버레이, 저장은 기존 단축키/버튼 로직에 연결해 쓰면 됨)
 *
 * 모바일/데스크탑 모두 대응. 캔버스는 DPR 스케일 적용.
 */

type QuickPrefs = {
  starDensity: number; // 0.2 ~ 2.0
  starBrightness: number; // 0.5 ~ 1.5
};

const DEFAULT_PREFS: QuickPrefs = {
  starDensity: 1.0,
  starBrightness: 1.0,
};

const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); // 상한 2로 고정(과도한 스케일 방지)

export default function HomeSky() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [prefs, setPrefs] = useState<QuickPrefs>(() => {
    try {
      const saved = localStorage.getItem("sky.prefs");
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  // 에디터 텍스트 상태(간단 버전)
  const [draft, setDraft] = useState<string>("");
  const editorRef = useRef<HTMLDivElement | null>(null);

  // 빠른설정 패널 표시
  const [showQuick, setShowQuick] = useState(false);

  // 달 아이콘 길게 누르기 감지
  const longPressTimer = useRef<number | null>(null);
  const moonRef = useRef<HTMLButtonElement | null>(null);

  // 별 데이터
  const starsRef = useRef<{ x: number; y: number; r: number; tw: number }[]>([]);

  // 캔버스 리사이즈 & 초기화
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
      const base = Math.round((w * h) / 9000); // 화면 크기당 기본 별 수
      const count = Math.max(100, Math.floor(base * prefs.starDensity));
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        tw: Math.random() * Math.PI * 2, // twinkle phase
      }));
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [prefs.starDensity]);

  // 렌더 루프
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const render = (t: number) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // 하늘 그라데이션(상: 네이비, 하: 짙은 청록) + 은은한 우주광
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#071739");
      g.addColorStop(0.45, "#09224a");
      g.addColorStop(1, "#0a2c50");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // 미세한 은하수 텍스처(노이즈 느낌)
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < 2; i++) {
        const rg = ctx.createRadialGradient(
          w * (0.2 + 0.6 * Math.random()),
          h * (0.25 + 0.3 * Math.random()),
          0,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * (0.8 + Math.random() * 0.4)
        );
        rg.addColorStop(0, "rgba(255,255,255,0.03)");
        rg.addColorStop(1, "rgba(255,255,255,0.0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;

      // 별 반짝임
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.tw += 0.015 + (i % 7) * 0.0005;
        const twinkle = (Math.sin(s.tw) + 1) * 0.5; // 0~1
        const a = (0.35 + 0.65 * twinkle) * prefs.starBrightness;
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, a)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.9 + twinkle * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }

      // 지면(실루엣) + 하단 영역 자연스러운 블렌드
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

  // contentEditable 포커스: 하늘 아무데나 클릭하면 포커스
  useEffect(() => {
    const onSkyClick = (e: MouseEvent) => {
      // 달/패널 클릭은 무시
      const moonEl = moonRef.current;
      if (moonEl && moonEl.contains(e.target as Node)) return;
      // 빠른설정 영역 무시
      const quick = document.getElementById("quick-panel");
      if (quick && quick.contains(e.target as Node)) return;

      editorRef.current?.focus();
    };
    window.addEventListener("click", onSkyClick);
    return () => window.removeEventListener("click", onSkyClick);
  }, []);

  // 로컬 보관
  useEffect(() => {
    localStorage.setItem("sky.prefs", JSON.stringify(prefs));
  }, [prefs]);

  // 달 아이콘 포인터 핸들러
  const onMoonPointerDown = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setShowQuick((s) => !s);
    }, 520); // 0.5초 길게누르기
  };
  const onMoonPointerUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const onMoonClick = () => {
    if (showQuick) return; // 길게누르기 중에는 이동 막기
    navigate("/settings");
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setDraft((e.target as HTMLDivElement).innerText);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden text-white">
      {/* 밤하늘 캔버스 */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* 달 아이콘 */}
      <button
        ref={moonRef}
        aria-label="Settings"
        className="absolute right-4 top-4 z-30 rounded-full p-2 hover:scale-105 transition-transform"
        onClick={onMoonClick}
        onPointerDown={onMoonPointerDown}
        onPointerUp={onMoonPointerUp}
        onPointerCancel={onMoonPointerUp}
      >
        <CrescentMoonSVG />
      </button>

      {/* 하늘 타이핑 에디터 */}
      <div
        ref={editorRef}
        role="textbox"
        aria-label="밤하늘 메모"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="absolute inset-0 z-10 px-6 md:px-12 outline-none focus:outline-none select-text
                   flex items-center justify-center"
        onInput={handleInput}
        // placeholder 대용 안내 텍스트
        data-placeholder="밤하늘에 오늘을 적어 보세요…"
        style={{
          // 달빛 글꼴 스타일
          fontFamily:
            "'Pretendard Variable', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans KR, Apple SD Gothic Neo, sans-serif",
          fontWeight: 500,
          fontSize: "clamp(18px, 3.4vw, 28px)",
          lineHeight: 1.6,
          textAlign: "center",
          color: "rgba(235,243,255,0.92)",
          textShadow:
            "0 0 0.4rem rgba(180,210,255,0.65), 0 0 1.2rem rgba(140,190,255,0.35)",
          // 배경과 자연스러운 블렌드
          mixBlendMode: "screen",
        }}
      />

      {/* contentEditable placeholder 구현 */}
      {!draft && (
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-6 md:px-12 text-center"
          style={{
            fontSize: "clamp(18px, 3.4vw, 28px)",
            lineHeight: 1.6,
            color: "rgba(220,235,255,0.42)",
            textShadow: "0 0 0.7rem rgba(150,190,255,0.2)",
          }}
        >
          밤하늘에 오늘을 적어 보세요…
        </div>
      )}

      {/* 빠른설정 패널 */}
      {showQuick && (
        <div
          id="quick-panel"
          className="absolute right-3 top-16 z-40 w-[260px] rounded-2xl border border-white/10 bg-[#0b1830]/80 p-3 backdrop-blur"
        >
          <h3 className="mb-2 text-sm text-white/80">빠른 설정</h3>
          <Slider
            label="별 밀도"
            min={0.2}
            max={2}
            step={0.05}
            value={prefs.starDensity}
            onChange={(v) => setPrefs((p) => ({ ...p, starDensity: v }))}
          />
          <Slider
            label="별 밝기"
            min={0.5}
            max={1.5}
            step={0.05}
            value={prefs.starBrightness}
            onChange={(v) => setPrefs((p) => ({ ...p, starBrightness: v }))}
          />
        </div>
      )}

      {/* 하단 탭바(심플) */}
      <nav
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 mx-auto mb-2 flex h-12 w-[min(520px,92%)] items-center justify-around
                   rounded-full border border-white/10 bg-black/40 backdrop-blur"
      >
        <Tab icon="home" label="Home" active />
        <Tab icon="calendar" label="Calendar" onClick={() => navigate('/calendar')} />
        <Tab icon="search" label="Search" onClick={() => navigate('/search')} />
        <Tab icon="link" label="Links" onClick={() => navigate('/recall')} />
      </nav>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mb-3 block text-xs text-white/70">
      <span className="mb-1 block">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-300"
      />
      <div className="mt-0.5 text-right text-[11px] text-white/50">{value.toFixed(2)}</div>
    </label>
  );
}

function Tab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: "home" | "calendar" | "search" | "link";
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center gap-2 rounded-full px-3 text-sm ${
        active ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
      }`}
    >
      <span className="inline-block">{getIcon(icon)}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function getIcon(name: "home" | "calendar" | "search" | "link") {
  switch (name) {
    case "home":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 11.5 12 4l9 7.5V20a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-8.5Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M16 3v4M8 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "search":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"></circle>
          <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.5"></path>
        </svg>
      );
    case "link":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M10 14l-1.5 1.5a4 4 0 1 1-5.7-5.7L4.5 8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 10l1.5-1.5a4 4 0 1 1 5.7 5.7L19.5 16" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
}

/** 고퀄 크레센트 달 (SVG mask + radialGradient) */
function CrescentMoonSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="moonGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#dbe7ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#c0d6ff" stopOpacity="0.55" />
        </radialGradient>

        {/* 달의 초승달을 만드는 마스크: 큰 원 - 작은 원 */}
        <mask id="crescentMask">
          <rect width="100%" height="100%" fill="black" />
          <circle cx="34" cy="30" r="18" fill="white" />
          <circle cx="42" cy="26" r="16" fill="black" />
        </mask>

        {/* 은은한 외곽 광채 */}
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 외곽 부드러운 글로우 */}
      <g filter="url(#softGlow)">
        <circle cx="34" cy="30" r="20" fill="url(#moonGlow)" mask="url(#crescentMask)" />
      </g>
    </svg>
  );
}
