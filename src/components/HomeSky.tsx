import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

type Rect = { x: number; y: number; w: number; h: number };

export type HomeSkyHandle = {
  setExclusions: (rects: Rect[]) => void;
};

type Props = {
  answerSignal?: number; // 요약 완료 시 반짝임 트리거
};

function devicePixelRatioSafe(c: HTMLCanvasElement) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const { clientWidth, clientHeight } = c;
  if (c.width !== Math.floor(clientWidth * dpr) || c.height !== Math.floor(clientHeight * dpr)) {
    c.width = Math.floor(clientWidth * dpr);
    c.height = Math.floor(clientHeight * dpr);
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const HomeSky = forwardRef<HomeSkyHandle, Props>(({ answerSignal = 0 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const exclusions = useRef<Rect[]>([]);
  const stars = useRef<{ x: number; y: number; tw: number }[]>([]);
  const shooting = useRef<{ x: number; y: number; vx: number; vy: number; life: number } | null>(null);
  const sparkle = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastAnswerSignal = useRef(0);

  useImperativeHandle(ref, () => ({
    setExclusions(rects: Rect[]) {
      exclusions.current = rects;
    },
  }));

  // 초기 별 배치
  useEffect(() => {
    const c = canvasRef.current!;
    const makeStars = () => {
      devicePixelRatioSafe(c);
      const N = Math.max(200, Math.floor((c.width * c.height) / 4000)); // 밀도
      stars.current = Array.from({ length: N }, () => ({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        tw: Math.random(),
      }));
    };
    makeStars();
    const onResize = () => makeStars();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d')!;

    let raf = 0;

    const draw = (t: number) => {
      devicePixelRatioSafe(c);
      const { width: w, height: h } = c;
      // 배경 그라데이션
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#06122b');
      g.addColorStop(1, '#0b1e3f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // 반짝이는 별
      for (const s of stars.current) {
        // 텍스트 배제 영역 체크 (DPR 고려)
        const hit = exclusions.current.some((r) => {
          const xx = s.x / (window.devicePixelRatio || 1);
          const yy = s.y / (window.devicePixelRatio || 1);
          return xx > r.x - 10 && xx < r.x + r.w + 10 && yy > r.y - 10 && yy < r.y + r.h + 10;
        });
        if (hit) continue;
        const phase = (t / 1000 + s.tw) * 2 * Math.PI;
        const alpha = 0.65 + 0.35 * Math.sin(phase);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(s.x, s.y, 1, 1);
      }

      // 별똥별
      if (shooting.current) {
        const sh = shooting.current;
        ctx.strokeStyle = 'rgba(180,220,255,0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * 4, sh.y - sh.vy * 4);
        ctx.stroke();
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life -= 1;
        if (sh.life <= 0) shooting.current = null;
      }

      // 요약 반짝 스파클
      if (sparkle.current) {
        const sp = sparkle.current;
        const life = 600; // ms
        const p = Math.min(1, ((performance.now()) - sp.t) / life);
        const r = 12 + 32 * p;
        const a = 0.6 * (1 - p);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,230,255,${a})`;
        ctx.fill();
        if (p >= 1) sparkle.current = null;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // 이벤트: 저장 완료 → 별똥별
    const onRecord = () => {
      const sx = Math.random() * c.width * 0.6 + c.width * 0.2;
      const sy = Math.random() * c.height * 0.3 + c.height * 0.1;
      shooting.current = { x: sx, y: sy, vx: 6, vy: 3, life: 50 };
    };
    window.addEventListener('sky:record-complete', onRecord as any);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('sky:record-complete', onRecord as any);
    };
  }, []);

  // 요약 반짝 트리거
  useEffect(() => {
    if (!canvasRef.current) return;
    if (answerSignal === lastAnswerSignal.current) return;
    lastAnswerSignal.current = answerSignal;
    const c = canvasRef.current;
    // 배제구역 밖 좌표를 찾아 스파클
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * c.width;
      const y = Math.random() * c.height * 0.6 + c.height * 0.1;
      const dpr = window.devicePixelRatio || 1;
      const xx = x / dpr, yy = y / dpr;
      const hit = exclusions.current.some((r) => xx > r.x - 10 && xx < r.x + r.w + 10 && yy > r.y - 10 && yy < r.y + r.h + 10);
      if (!hit) {
        sparkle.current = { x, y, t: performance.now() };
        break;
      }
    }
  }, [answerSignal]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[10] block w-full h-full" />;
});

export default HomeSky;
