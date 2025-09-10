import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSkySettings } from '../contexts/SkySettingsContext';
// Helper component, co-located for simplicity
function Slider({ label, min, max, step, value, onChange }) {
    return (_jsxs("label", { className: "mb-3 block text-xs text-white/70", children: [_jsx("span", { className: "mb-1 block", children: label }), _jsx("input", { type: "range", min: min, max: max, step: step, value: value, onChange: (e) => onChange(Number(e.target.value)), className: "w-full accent-sky-300" }), _jsx("div", { className: "mt-0.5 text-right text-[11px] text-white/50", children: value.toFixed(2) })] }));
}
const QuickSettingsPanel = () => {
    const { isPanelOpen, prefs, setPrefs } = useSkySettings();
    if (!isPanelOpen)
        return null;
    return (_jsxs("div", { id: "quick-panel", className: "absolute right-3 top-16 z-40 w-[260px] rounded-2xl border border-white/10 bg-[#0b1830]/80 p-3 backdrop-blur", children: [_jsx("h3", { className: "mb-2 text-sm text-white/80", children: "\uBE60\uB978 \uC124\uC815" }), _jsx(Slider, { label: "\uBCC4 \uBC00\uB3C4", min: 0.2, max: 2, step: 0.05, value: prefs.starDensity, onChange: (v) => setPrefs(p => ({ ...p, starDensity: v })) }), _jsx(Slider, { label: "\uBCC4 \uBC1D\uAE30", min: 0.5, max: 1.5, step: 0.05, value: prefs.starBrightness, onChange: (v) => setPrefs(p => ({ ...p, starBrightness: v })) })] }));
};
export default QuickSettingsPanel;
