import { useMemo } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
type Props = { sizeVw?: number; onClick?: () => void; date?: Date; };
export default function Moon({ sizeVw = 8.5, onClick, date = new Date() }: Props) {
  const phase = useMemo(() => {
    const synodic = 29.530588853;
    const newMoon2000 = Date.UTC(2000, 0, 6, 18, 14);
    const days = (date.getTime() - newMoon2000) / 86400000;
    const frac = ((days % synodic) + synodic) % synodic / synodic;
    return Math.sin(frac * Math.PI * 2);
  }, [date]);
  const mx = useSpring(useMotionValue(0), { stiffness: 30, damping: 12 });
  const my = useSpring(useMotionValue(0), { stiffness: 30, damping: 12 });
  const size = `${sizeVw}vw`;
  return (
    <div className="pointer-events-none absolute right-[4vw] top-[3.5vh] z-20"
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 6);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 6);
      }}>
      <div className="absolute -inset-[10vw] rounded-full pointer-events-none"
        style={{
          maskImage: `radial-gradient(closest-side, rgba(0,0,0,0.6), rgba(0,0,0,0) 65%)`,
          WebkitMaskImage: `radial-gradient(closest-side, rgba(0,0,0,0.6), rgba(0,0,0,0) 65%)`,
          background: "rgba(0,0,0,0.4)", zIndex: 5,
        }} />
      <motion.div aria-hidden className="absolute pointer-events-none"
        style={{
          width: `calc(${size} * 2.4)`, height: `calc(${size} * 1.9)`,
          right: `calc(${size} * -0.7)`, top: `calc(${size} * -0.45)`,
          filter: "blur(12px)", opacity: 0.18, mixBlendMode: "screen",
          background: "radial-gradient(60% 50% at 60% 50%, rgba(255,255,230,0.9), rgba(255,255,230,0.0) 70%)",
          translateX: mx, translateY: my, zIndex: 10,
        }} />
      <motion.button type="button" onClick={onClick}
        className="relative pointer-events-auto select-none outline-none"
        style={{ width: size, height: size, translateX: mx, translateY: my }}
        whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}
        aria-label="설정 열기">
        <div className="rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,255,220,0.35)]"
          style={{
            width: "100%", height: "100%", backgroundImage: `url(/assets/moon.png)`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "saturate(0.9) brightness(0.92) contrast(1.02) hue-rotate(-6deg)",
          }} />
        <div className="absolute inset-0 rounded-full mix-blend-multiply"
          style={{
            maskImage: `radial-gradient(120% 120% at ${50 + phase * 50}% 50%, rgba(0,0,0,0) 46%, rgba(0,0,0,1) 52%)`,
            WebkitMaskImage: `radial-gradient(120% 120% at ${50 + phase * 50}% 50%, rgba(0,0,0,0) 46%, rgba(0,0,0,1) 52%)`,
            background: "radial-gradient(80% 80% at 45% 45%, rgba(0,0,0,0.0), rgba(0,0,0,0.75))",
            opacity: 0.85,
          }} />
      </motion.button>
    </div>
  );
}
