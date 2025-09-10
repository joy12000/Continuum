import { jsx as _jsx } from "react/jsx-runtime";
import React, { useRef, useEffect } from 'react';
import { useSkySettings } from '../contexts/SkySettingsContext';
const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
const SkyCanvasAnimation = () => {
    const { prefs } = useSkySettings();
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const starsRef = useRef([]);
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
    return _jsx("canvas", { ref: canvasRef, className: "fixed inset-0 -z-10 block w-full h-full" });
};
export default React.memo(SkyCanvasAnimation);
