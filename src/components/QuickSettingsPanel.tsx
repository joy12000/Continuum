import React from 'react';
import { useSkySettings } from '../contexts/SkySettingsContext';

// Helper component, co-located for simplicity
function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; }) {
  return (
    <label className="mb-3 block text-xs text-white/70">
      <span className="mb-1 block">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-sky-300" />
      <div className="mt-0.5 text-right text-[11px] text-white/50">{value.toFixed(2)}</div>
    </label>
  );
}

const QuickSettingsPanel: React.FC = () => {
  const { isPanelOpen, prefs, setPrefs } = useSkySettings();

  if (!isPanelOpen) return null;

  return (
    <div id="quick-panel" className="absolute right-3 top-16 z-40 w-[260px] rounded-2xl border border-white/10 bg-[#0b1830]/80 p-3 backdrop-blur">
      <h3 className="mb-2 text-sm text-white/80">빠른 설정</h3>
      <Slider 
        label="별 밀도" 
        min={0.2} 
        max={2} 
        step={0.05} 
        value={prefs.starDensity} 
        onChange={(v) => setPrefs(p => ({ ...p, starDensity: v }))} 
      />
      <Slider 
        label="별 밝기" 
        min={0.5} 
        max={1.5} 
        step={0.05} 
        value={prefs.starBrightness} 
        onChange={(v) => setPrefs(p => ({ ...p, starBrightness: v }))} 
      />
    </div>
  );
};

export default QuickSettingsPanel;
