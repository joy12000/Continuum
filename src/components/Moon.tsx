'use client';
import { useMemo } from "react";
import { motion } from "framer-motion";

type Props = {
  sizeVw?: number;        // Moon size in vw
  onClick?: () => void;   // Click handler
  date?: Date;            // Date for moon phase calculation
};

export default function Moon({ sizeVw = 3.7, onClick, date = new Date() }: Props) {
  // Calculate moon phase -1 (full) to 0 (new) to 1 (full)
  const phase = useMemo(() => {
    const synodic = 29.530588853; 
    const newMoon2000 = Date.UTC(2000, 0, 6, 18, 14); 
    const days = (date.getTime() - newMoon2000) / 86400000;
    const frac = ((days % synodic) + synodic) % synodic / synodic; // 0..1
    return Math.sin(frac * Math.PI * 2);
  }, [date]);

  const size = `clamp(34px, ${sizeVw}vw, 61px)`;

  const handleClick = (e: React.MouseEvent) => {
    onClick?.();
  };

  return (
    <div className="pointer-events-none absolute right-[2.5vw] top-[2.2vh] z-20">
      {/* Background Glow */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: `calc(${size} * 2.5)`,
          height: `calc(${size} * 2.1)`,
          right: `calc(${size} * -0.75)`,
          top: `calc(${size} * -0.55)`,
          filter: "blur(16px)",
          opacity: 0.35, 
          background:
            "radial-gradient(60% 50% at 60% 50%, rgba(200,220,255,0.9), rgba(200,220,255,0.0) 70%)",
          mixBlendMode: "screen",
          zIndex: 10,
        }}
      />

      <motion.button
        type="button"
        onClick={handleClick}
        className="relative pointer-events-auto select-none outline-none"
        style={{ width: size, height: size }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        aria-label="Settings"
      >
        {/* Moon Surface */}
        <div
          className="rounded-full overflow-hidden shadow-[0_0_24px_rgba(200,220,255,0.35)]"
          style={{
            width: "100%",
            height: "100%",
            backgroundImage: `url(/assets/moon.png)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(0.8) brightness(1.4) contrast(1.1) hue-rotate(-8deg)",
          }}
        />

        {/* Faint Overlay */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: 'hsla(222, 47%, 80%, 0.1)',
            mixBlendMode: 'overlay',
          }}
        />

        {/* Shadow Mask */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(86% 86% at 50% 50%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.25) 100%)",
            mixBlendMode: "multiply",
          }}
        />

        {/* Moon Phase Shadow */}
        <div
          className="absolute inset-0 rounded-full mix-blend-hard-light pointer-events-none"
          style={{
            maskImage: `radial-gradient(120% 120% at ${50 + phase * 50}% 50%, rgba(0,0,0,0) 48%, rgba(0,0,0,1) 54%)`,
            WebkitMaskImage: `radial-gradient(120% 120% at ${50 + phase * 50}% 50%, rgba(0,0,0,0) 48%, rgba(0,0,0,1) 54%)`,
            background:
              "radial-gradient(80% 80% at 45% 45%, rgba(0,0,0,0.2), rgba(0,0,0,0.85))",
            opacity: 0.7,
          }}
        />
      </motion.button>
    </div>
  );
}
