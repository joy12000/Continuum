import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toasts } from "../components/Toasts";
import { toast } from "../lib/toast";
const DEFAULT_PREFS = {
    starDensity: 1.0,
    starBrightness: 1.0,
};
const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
// Main Component
export default function HomeSky({ answerSignal, onOpenAnswer }) {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const containerRef = useRef(null); // Ref for meteor container
    const rafRef = useRef(null);
    const [prefs, setPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem("sky.prefs");
            return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
        }
        catch {
            return DEFAULT_PREFS;
        }
    });
    const [draft, setDraft] = useState("");
    const editorRef = useRef(null);
    const [showQuick, setShowQuick] = useState(false);
    const [showAnswerStar, setShowAnswerStar] = useState(false);
    const starsRef = useRef([]);
    useEffect(() => {
        if (answerSignal && answerSignal > 0) {
            setShowAnswerStar(true);
        }
    }, [answerSignal]);
    // Canvas resize and star seeding effect
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
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
    // Canvas render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
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
                const rg = ctx.createRadialGradient(w * (0.2 + 0.6 * Math.random()), h * (0.25 + 0.3 * Math.random()), 0, w * 0.5, h * 0.5, Math.max(w, h) * (0.8 + Math.random() * 0.4));
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
        return () => { if (rafRef.current)
            cancelAnimationFrame(rafRef.current); };
    }, [prefs.starBrightness]);
    // Focus handling
    useEffect(() => {
        const onSkyClick = (e) => {
            const target = e.target;
            if (document.getElementById("quick-panel")?.contains(target))
                return;
            if (document.getElementById("save-button")?.contains(target))
                return;
            editorRef.current?.focus();
        };
        window.addEventListener("click", onSkyClick);
        return () => window.removeEventListener("click", onSkyClick);
    }, []);
    // Save prefs to localStorage
    useEffect(() => {
        localStorage.setItem("sky.prefs", JSON.stringify(prefs));
    }, [prefs]);
    // Listen for paste event from other pages (e.g., Calendar)
    useEffect(() => {
        const handlePaste = (e) => {
            const detail = e.detail;
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
    // Listen for long-press event from the global moon to toggle quick settings
    useEffect(() => {
        const handleOpenQuickSettings = () => {
            setShowQuick(s => !s);
        };
        // Expose the toggle function globally for the moon button to call
        window.toggleQuickSettings = handleOpenQuickSettings;
        return () => {
            window.toggleQuickSettings = undefined;
        };
    }, []);
    // Shooting star animation function
    function spawnClassicMeteor() {
        const host = containerRef.current;
        if (!host)
            return;
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
    const handleInput = (e) => {
        setDraft(e.target.innerText);
    };
    const handleSave = () => {
        if (!draft || !draft.trim())
            return;
        const payload = { text: draft, createdAt: Date.now() };
        window.dispatchEvent(new CustomEvent("sky:save", { detail: payload }));
        setDraft("");
        if (editorRef.current)
            editorRef.current.innerText = "";
        toast.success("저장했어요 ✨");
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++)
            setTimeout(spawnClassicMeteor, i * 350);
    };
    return (_jsxs("div", { ref: containerRef, className: "relative h-dvh w-full overflow-hidden text-white", children: [_jsx(Toasts, {}), _jsx("canvas", { ref: canvasRef, className: "absolute inset-0 block w-full h-full" }), _jsx("div", { className: "absolute top-3 left-3 z-30", children: _jsxs("button", { className: "sky-constellation", onClick: handleSave, "aria-label": "\uC800\uC7A5", children: [_jsx("span", { className: "star s1" }), _jsx("span", { className: "star s2" }), _jsx("span", { className: "star s3" }), _jsx("span", { className: "star s4" })] }) }), _jsx("div", { ref: editorRef, role: "textbox", "aria-label": "\uBC24\uD558\uB298 \uBA54\uBAA8", contentEditable: true, suppressContentEditableWarning: true, spellCheck: false, className: "absolute inset-0 z-10 px-6 md:px-12 outline-none focus:outline-none select-text flex items-center justify-center", onInput: handleInput, "data-placeholder": "\uBC24\uD558\uB298\uC5D0 \uC624\uB298\uC758 \uC870\uAC01\uC744 \uC0C8\uACA8\uBCF4\uC138\uC694.", style: {
                    fontFamily: "'Pretendard Variable', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans KR, Apple SD Gothic Neo, sans-serif",
                    fontWeight: 500,
                    fontSize: "clamp(18px, 3.4vw, 28px)",
                    lineHeight: 1.6,
                    textAlign: "center",
                    color: "rgba(235,243,255,0.92)",
                    textShadow: "0 0 0.4rem rgba(180,210,255,0.65), 0 0 1.2rem rgba(140,190,255,0.35)",
                    mixBlendMode: "screen",
                } }), !draft && (_jsx("div", { className: "pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-6 md:px-12 text-center", style: { fontSize: "clamp(18px, 3.4vw, 28px)", lineHeight: 1.6, color: "rgba(220,235,255,0.42)", textShadow: "0 0 0.7rem rgba(150,190,255,0.2)" }, children: "\uBC24\uD558\uB298\uC5D0 \uC624\uB298\uC758 \uC870\uAC01\uC744 \uC0C8\uACA8\uBCF4\uC138\uC694." })), showQuick && (_jsxs("div", { id: "quick-panel", className: "absolute right-3 top-16 z-40 w-[260px] rounded-2xl border border-white/10 bg-[#0b1830]/80 p-3 backdrop-blur", children: [_jsx("h3", { className: "mb-2 text-sm text-white/80", children: "\uBE60\uB978 \uC124\uC815" }), _jsx(Slider, { label: "\uBCC4 \uBC00\uB3C4", min: 0.2, max: 2, step: 0.05, value: prefs.starDensity, onChange: (v) => setPrefs((p) => ({ ...p, starDensity: v })) }), _jsx(Slider, { label: "\uBCC4 \uBC1D\uAE30", min: 0.5, max: 1.5, step: 0.05, value: prefs.starBrightness, onChange: (v) => setPrefs((p) => ({ ...p, starBrightness: v })) })] }))] }));
}
// Helper Components
function Slider({ label, min, max, step, value, onChange }) {
    return (_jsxs("label", { className: "mb-3 block text-xs text-white/70", children: [_jsx("span", { className: "mb-1 block", children: label }), _jsx("input", { type: "range", min: min, max: max, step: step, value: value, onChange: (e) => onChange(Number(e.target.value)), className: "w-full accent-sky-300" }), _jsx("div", { className: "mt-0.5 text-right text-[11px] text-white/50", children: value.toFixed(2) })] }));
}
function AnswerStarSVG() {
    return (_jsxs("svg", { width: "36", height: "36", viewBox: "0 0 24 24", fill: "url(#answer-gradient)", stroke: "#fff", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "answer-gradient", x1: "0%", y1: "0%", x2: "100%", y2: "100%", children: [_jsx("stop", { offset: "0%", style: { stopColor: '#fde047', stopOpacity: 1 } }), _jsx("stop", { offset: "100%", style: { stopColor: '#f97316', stopOpacity: 1 } })] }) }), _jsx("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" })] }));
}
function CrescentMoonSVG() {
    return (_jsxs("svg", { width: "36", height: "36", viewBox: "0 0 64 64", xmlns: "http://www.w3.org/2000/svg", children: [_jsxs("defs", { children: [_jsxs("radialGradient", { id: "moonGlow", cx: "50%", cy: "45%", r: "55%", children: [_jsx("stop", { offset: "0%", stopColor: "#ffffff", stopOpacity: "0.95" }), _jsx("stop", { offset: "60%", stopColor: "#dbe7ff", stopOpacity: "0.85" }), _jsx("stop", { offset: "100%", stopColor: "#c0d6ff", stopOpacity: "0.55" })] }), _jsxs("mask", { id: "crescentMask", children: [_jsx("rect", { width: "100%", height: "100%", fill: "black" }), _jsx("circle", { cx: "34", cy: "30", r: "18", fill: "white" }), _jsx("circle", { cx: "42", cy: "26", r: "16", fill: "black" })] }), _jsxs("filter", { id: "softGlow", x: "-50%", y: "-50%", width: "200%", height: "200%", children: [_jsx("feGaussianBlur", { stdDeviation: "2.6", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), _jsx("g", { filter: "url(#softGlow)", children: _jsx("circle", { cx: "34", cy: "30", r: "20", fill: "url(#moonGlow)", mask: "url(#crescentMask)" }) })] }));
}
function SaveIcon() {
    return (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }), _jsx("polyline", { points: "17 21 17 13 7 13 7 21" }), _jsx("polyline", { points: "7 3 7 8 15 8" })] }));
}
