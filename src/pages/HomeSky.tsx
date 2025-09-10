import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toasts } from "../components/Toasts";
import { toast } from "../lib/toast";
import SkyCanvasAnimation from "../components/SkyCanvasAnimation";
import Moon from "../components/Moon";

interface HomeSkyProps {
  answerSignal?: number;
  onOpenAnswer?: () => void;
}

// Main Component
export default function HomeSky({ answerSignal, onOpenAnswer }: HomeSkyProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null); // Ref for meteor container
  const [draft, setDraft] = useState<string>("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [showAnswerStar, setShowAnswerStar] = useState(false);

  useEffect(() => {
    if (answerSignal && answerSignal > 0) {
      setShowAnswerStar(true);
    }
  }, [answerSignal]);

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
      <SkyCanvasAnimation />
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
        data-placeholder="밤하늘에 오늘의 조각을 새겨보세요."
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
          밤하늘에 오늘의 조각을 새겨보세요.
        </div>
      )}
    </div>
  );
}
