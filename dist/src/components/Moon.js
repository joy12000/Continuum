import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useSkySettings } from "../contexts/SkySettingsContext";
export default function Moon({ sizeVw = 3.7, onClick, date = new Date() }) {
    const { togglePanel } = useSkySettings();
    const pressTimer = useRef(null);
    const longPressTriggered = useRef(false);
    // (1) 달 위상 계산: -1(그믐) ~ 0(보름) ~ 1(초승)
    const phase = useMemo(() => {
        const synodic = 29.530588853; // 평균 삭망월
        const newMoon2000 = Date.UTC(2000, 0, 6, 18, 14); // 기준 신월(UTC)
        const days = (date.getTime() - newMoon2000) / 86400000;
        const frac = ((days % synodic) + synodic) % synodic / synodic; // 0..1
        return Math.sin(frac * Math.PI * 2);
    }, [date]);
    // 반응형 크기: 여백 과다 방지 (최소/최대 제한)
    const size = `clamp(34px, ${sizeVw}vw, 61px)`;
    const handlePointerDown = () => {
        longPressTriggered.current = false;
        pressTimer.current = setTimeout(() => {
            togglePanel();
            longPressTriggered.current = true;
        }, 500); // 500ms for long press
    };
    const handlePointerUp = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
        }
    };
    const handleClick = (e) => {
        if (longPressTriggered.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick?.();
    };
    return (_jsxs("div", { className: "pointer-events-none absolute right-[2.5vw] top-[2.2vh] z-20", children: [_jsx("div", { "aria-hidden": true, className: "absolute pointer-events-none", style: {
                    width: `calc(${size} * 2.5)`,
                    height: `calc(${size} * 2.1)`,
                    right: `calc(${size} * -0.75)`,
                    top: `calc(${size} * -0.55)`,
                    filter: "blur(16px)",
                    opacity: 0.35,
                    background: "radial-gradient(60% 50% at 60% 50%, rgba(200,220,255,0.9), rgba(200,220,255,0.0) 70%)",
                    mixBlendMode: "screen",
                    zIndex: 10,
                } }), _jsxs(motion.button, { type: "button", onClick: handleClick, onPointerDown: handlePointerDown, onPointerUp: handlePointerUp, onPointerLeave: handlePointerUp, className: "relative pointer-events-auto select-none outline-none", style: { width: size, height: size }, whileTap: { scale: 0.98 }, transition: { type: "spring", stiffness: 400, damping: 28 }, "aria-label": "\uC124\uC815 \uC5F4\uAE30", children: [_jsx("div", { className: "rounded-full overflow-hidden shadow-[0_0_24px_rgba(200,220,255,0.35)]", style: {
                            width: "100%",
                            height: "100%",
                            backgroundImage: `url(/assets/moon.png)`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            filter: "saturate(0.8) brightness(1.4) contrast(1.1) hue-rotate(-8deg)",
                        } }), _jsx("div", { className: "absolute inset-0 rounded-full", style: {
                            backgroundColor: 'hsla(222, 47%, 80%, 0.1)',
                            mixBlendMode: 'overlay',
                        } }), _jsx("div", { className: "absolute inset-0 rounded-full pointer-events-none", style: {
                            background: "radial-gradient(86% 86% at 50% 50%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.25) 100%)",
                            mixBlendMode: "multiply",
                        } }), _jsx("div", { className: "absolute inset-0 rounded-full mix-blend-hard-light pointer-events-none", style: {
                            maskImage: `radial-gradient(120% 120% at ${50 + phase * 50}% 50%, rgba(0,0,0,0) 48%, rgba(0,0,0,1) 54%)`,
                            WebkitMaskImage: `radial-gradient(120% 120% at ${50 + phase * 50}% 50%, rgba(0,0,0,0) 48%, rgba(0,0,0,1) 54%)`,
                            background: "radial-gradient(80% 80% at 45% 45%, rgba(0,0,0,0.2), rgba(0,0,0,0.85))",
                            opacity: 0.7,
                        } })] })] }));
}
