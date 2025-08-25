
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * HomeSky (NEW)
 * See README in patch for usage.
 */
export default function HomeSky(props: {
  onSave?: (payload: { text: string; createdAt: number }) => void;
  onOpenSettings?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState<string>("");
  const [savedToast, setSavedToast] = useState<string>("");
  const isComposingRef = useRef(false);

  useEffect(() => {
    const onPointer = () => inputRef.current?.focus();
    const el = containerRef.current;
    el?.addEventListener("pointerdown", onPointer);
    return () => el?.removeEventListener("pointerdown", onPointer);
  }, []);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    const onStart = () => (isComposingRef.current = true);
    const onEnd = () => (isComposingRef.current = false);
    ta.addEventListener("compositionstart", onStart);
    ta.addEventListener("compositionend", onEnd);
    return () => {
      ta.removeEventListener("compositionstart", onStart);
      ta.removeEventListener("compositionend", onEnd);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [text]);

  useEffect(() => {
    (window as any).skyNotifySummary = ({ title, text }: { title: string; text: string }) => {
      spawnTwinkleStar(title, text);
    };
  }, []);

  const lines = useMemo(() => text.split(/\n/), [text]);

  function handleSave() {
    const payload = { text, createdAt: Date.now() };
    if (props.onSave) props.onSave(payload);
    else window.dispatchEvent(new CustomEvent("sky:save", { detail: payload }));
    setSavedToast("저장했어요 ✨");
    setTimeout(() => setSavedToast(""), 1600);
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
      showSummaryModal(title, summary);
      star.remove();
    });
    host.appendChild(star);
    requestAnimationFrame(() => star.classList.add("twinkle-on"));
  }

  function showSummaryModal(title: string, summary: string) {
    const modal = document.createElement("div");
    modal.className = "sky-modal";
    modal.innerHTML = `
      <div class="sky-modal__panel">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(summary).replace(/\n/g, "<br/>")}</p>
        <div class="sky-modal__actions">
          <button class="btn outline" data-close>닫기</button>
          <button class="btn" data-paste>본문에 붙여넣기</button>
        </div>
      </div>`;
    modal.addEventListener("click", (e: any) => {
      if (e.target.dataset.close !== undefined || e.target === modal) modal.remove();
      if (e.target.dataset.paste !== undefined) {
        setText((prev) => (prev ? prev + "\n\n" : "") + summary);
        modal.remove();
      }
    });
    document.body.appendChild(modal);
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#039;" }[m] as string));
  }

  function openSettings() {
    if (props.onOpenSettings) props.onOpenSettings();
    else window.dispatchEvent(new Event("sky:open-settings"));
  }

  return (
    <div ref={containerRef} className="sky-root">
      <div className="sky-gradient" /><div className="sky-stars" />
      <button className="sky-moon" onClick={openSettings} aria-label="설정"><span className="moon-core" /></button>
      <button className="sky-constellation" onClick={handleSave} aria-label="저장">
        <span className="star s1" /><span className="star s2" /><span className="star s3" /><span className="star s4" />
      </button>
      <textarea
        ref={inputRef}
        className="sky-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="밤하늘에 오늘을 적어 보세요…"
      />
      <div className="sky-text">{lines.map((ln, i) => <div key={i} className="ln">{ln || " "}</div>)}</div>
      <div className="sky-hud">{savedToast && <div className="toast">{savedToast}</div>}</div>
    </div>
  );
}
