
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SkyBackground from "./SkyBackground";

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
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [panelOpen, setPanelOpen] = useState(false);
  const nav = useNavigate();

  const longBind = useLongPress(() => setPanelOpen(v => !v));

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  return (
    <div className="relative w-full h-dvh overflow-hidden select-none">
      <SkyBackground />
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
    </div>
  );
}
