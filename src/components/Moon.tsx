import { useMemo } from "react";
import { motion } from "framer-motion";

type Props = {
  sizeVw?: number;        // 달 지름 기준(vw) - clamp와 병용
  onClick?: () => void;   // 클릭 시 라우팅
  date?: Date;            // 위상 계산용(기본: 현재)
};

export default function Moon({ sizeVw = 5.5, onClick, date = new Date() }: Props) {
  // (1) 달 위상 계산: -1(그믐) ~ 0(보름) ~ 1(초승)
  const phase = useMemo(() => {
    const synodic = 29.530588853; // 평균 삭망월
    const newMoon2000 = Date.UTC(2000, 0, 6, 18, 14); // 기준 신월(UTC)
    const days = (date.getTime() - newMoon2000) / 86400000;
    const frac = ((days % synodic) + synodic) % synodic / synodic; // 0..1
    return Math.sin(frac * Math.PI * 2);
  }, [date]);

  // 반응형 크기: 여백 과다 방지 (최소/최대 제한)
  const size = `clamp(51px, ${sizeVw}vw, 91px)`;

  return (
    <div className="pointer-events-none absolute right-[2.5vw] top-[2.2vh] z-20">
      {/* (A) 달 주변 별 밝기 억제(광해) - 반경 소폭 확대 */}
      <div
        className="absolute -inset-[12vw] rounded-full pointer-events-none"
        style={{
          maskImage: `radial-gradient(closest-side, rgba(0,0,0,0.55), rgba(0,0,0,0) 68%)`,
          WebkitMaskImage: `radial-gradient(closest-side, rgba(0,0,0,0.55), rgba(0,0,0,0) 68%)`,
          background: "rgba(0,0,0,0.38)",
          zIndex: 5,
        }}
      />

      {/* (B) 타원형 헤일로(살짝만) */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: `calc(${size} * 2.2)`,
          height: `calc(${size} * 1.8)`,
          right: `calc(${size} * -0.65)`,
          top: `calc(${size} * -0.42)`,
          filter: "blur(12px)",
          opacity: 0.16, // 0.14~0.18 권장
          background:
            "radial-gradient(60% 50% at 60% 50%, rgba(255,255,230,0.9), rgba(255,255,230,0.0) 70%)",
          mixBlendMode: "screen",
          zIndex: 10,
        }}
      />

      {/* (C) 달 버튼(설정 이동) - 고정(패럴랙스 제거) */}
      <motion.button
        type="button"
        onClick={onClick}
        className="relative pointer-events-auto select-none outline-none"
        style={{ width: size, height: size }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        aria-label="설정 열기"
      >
        {/* 본체 텍스처 */}
        <div
          className="rounded-full overflow-hidden shadow-[0_0_16px_rgba(255,255,220,0.28)]"
          style={{
            width: "100%",
            height: "100%",
            backgroundImage: `url(/assets/moon.png)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            // 배경(#0A2142 계열)과 톤 정합
            filter: "saturate(0.9) brightness(0.9) contrast(1.03) hue-rotate(-6deg)",
          }}
        />

        {/* (림 다크닝) 가장자리 살짝 어둡게 → 경계가 '붙어' 보이도록 */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(86% 86% at 50% 50%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.18) 100%)",
            mixBlendMode: "multiply",
          }}
        />

        {/* (위상 그림자) */}
        <div
          className="absolute inset-0 rounded-full mix-blend-multiply pointer-events-none"
          style={{
            maskImage: `radial-gradient(120% 120% at ${50 + phase * 50}% 50%, rgba(0,0,0,0) 46%, rgba(0,0,0,1) 52%)`,
            WebkitMaskImage: `radial-gradient(120% 120% at ${50 + phase * 50}% 50%, rgba(0,0,0,0) 46%, rgba(0,0,0,1) 52%)`,
            background:
              "radial-gradient(80% 80% at 45% 45%, rgba(0,0,0,0.0), rgba(0,0,0,0.75))",
            opacity: 0.85,
          }}
        />
      </motion.button>
    </div>
  );
}