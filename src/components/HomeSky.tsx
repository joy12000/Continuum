import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLongPress } from '../hooks/useLongPress';

type Star = { id:number; x:number; y:number; r:number; tw:number; phase:number };
type Meteor = { x:number; y:number; vx:number; vy:number; life:number; maxLife:number };
const clamp = (v:number, min:number, max:number)=>Math.min(max, Math.max(min, v));

type Props = {
  onOpenSettings: () => void;
  onOpenEditor: () => void;
  onOpenAnswer: () => void;           // 스파클 별 클릭 시 호출(Answer/GeneratedAnswer 모달 열기)
  answerSignal?: string | number | null; // 값이 바뀌면 "AI 답변 도착"으로 간주 → 랜덤 별 스파클
  bottomBarSelector?: string; // e.g., '#tabbar'
};

/**
 * 홈 밤하늘 컴포넌트 v2
 * - 기본 별배경 + 달 버튼(오른쪽 위)
 * - 달: 길게 누른 후 드래그(위/아래)로 밝기/반경 조절(위 = 밝고 큼, 아래 = 어둡고 작음)
 * - 별 밀도: 배경을 길게 누른 뒤 좌/우 드래그로 섬세 조절(랜덤 리셋). 저사양 기기 친화.
 * - "AI 답변 생성" 신호(answerSignal 변경) → 랜덤 별 스파클 8초
 * - "오늘 기록 완료" 커스텀 이벤트(window.dispatchEvent(new CustomEvent('sky:record-complete'))) → 별똥별
 * - 클릭 로직: 달/탭바 제외 →
 *     - 스파클 별을 눌렀다면 onOpenAnswer()
 *     - 아니면 onOpenEditor()
 * - 모션 민감 사용자(prefers-reduced-motion) 배려: 반짝임 완화
 * - safe-area-inset 고려로 노치/홈 인디케이터 회피
 */
export default function HomeSky({ onOpenSettings, onOpenEditor, onOpenAnswer, answerSignal, bottomBarSelector }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const moonRef = useRef<HTMLButtonElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);

  // 사용자 설정 (로컬 저장)
  const [density, setDensity] = useState<number>(() => {
    const v = Number(localStorage.getItem('sky_density') || '0.55');
    return clamp(isFinite(v) ? v : 0.55, 0.2, 1.2);
  });
  const [moonBright, setMoonBright] = useState<number>(() => {
    const v = Number(localStorage.getItem('moon_brightness') || '1.0');
    return clamp(isFinite(v) ? v : 1.0, 0.6, 1.6);
  });

  // 스파클 별 상태
  const [celebrateId, setCelebrateId] = useState<number | null>(null);
  const celebrateUntilRef = useRef<number>(0);

  // 캔버스 드로잉
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const prefersReduced = globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.max(1, Math.min(2, (globalThis.devicePixelRatio || 1)));
    let w = 0, h = 0;

    function initStars() {
      const base = Math.max(60, Math.min(320, Math.floor((w*h) / 6500)));
      const count = Math.max(20, Math.min(480, Math.floor(base * density)));
      const arr: Star[] = [];
      for (let i=0;i<count;i++) {
        arr.push({
          id: i+1,
          x: Math.random()*w,
          y: Math.random()*h,
          r: Math.random()*1.4 + 0.3,
          tw: Math.random()*1.2 + 0.4,
          phase: Math.random() * Math.PI * 2
        });
      }
      starsRef.current = arr;
    }

    function resize() {
      const { clientWidth, clientHeight } = canvas.parentElement as HTMLElement;
      w = Math.max(1, clientWidth);
      h = Math.max(1, clientHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
      draw(0);
    }

    let raf = 0;
    let last = 0;
    function draw(t: number) {
      if (t - last < 1000/30) { raf = requestAnimationFrame(draw); return; }
      last = t;
      ctx.clearRect(0, 0, w, h);

      const now = performance.now();
      const cid = celebrateId;

      // 별들
      for (const s of starsRef.current) {
        let alpha = 0.85;
        if (!prefersReduced) alpha = 0.55 + 0.45 * Math.sin(s.phase + t/1000 * s.tw);
        let rr = s.r;
        if (cid && s.id === cid && now < celebrateUntilRef.current) {
          rr = s.r + 0.8 + 0.4*Math.sin(t/160);
          // halo
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(s.x, s.y, rr*4, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(170,200,255,0.45)';
          ctx.fill();
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rr, 0, Math.PI*2);
        ctx.fillStyle = '#cfe3ff';
        ctx.fill();
        ctx.restore();
      }

      // 별똥별
      for (let i=meteorsRef.current.length-1; i>=0; i--) {
        const m = meteorsRef.current[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life += 1;
        // tail
        const tail = 20;
        const grad = ctx.createLinearGradient(m.x - m.vx*tail, m.y - m.vy*tail, m.x, m.y);
        grad.addColorStop(0, 'rgba(180,210,255,0)');
        grad.addColorStop(1, 'rgba(200,220,255,0.9)');
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x - m.vx*tail, m.y - m.vy*tail);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        ctx.restore();
        if (m.life > m.maxLife || m.x < -50 || m.y > h+50 || m.y < -50 || m.x > w+50) {
          meteorsRef.current.splice(i,1);
        }
      }

      raf = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement as Element);
    resize();
    raf = requestAnimationFrame(draw);

    function onRecordComplete() {
      // spawn one meteor from upper-left area
      const startX = Math.random()* (w*0.3);
      const startY = Math.random()* (h*0.3);
      const speed = 8 + Math.random()*4;
      const angle = Math.PI/4 + (Math.random()*0.15); // diag down-right
      meteorsRef.current.push({
        x: startX, y: startY,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        life: 0, maxLife: 90
      });
    }
    window.addEventListener('sky:record-complete', onRecordComplete as any);

    return () => {
      window.removeEventListener('sky:record-complete', onRecordComplete as any);
      ro.disconnect(); cancelAnimationFrame(raf);
    };
  }, [density, celebrateId]);

  // answerSignal 변경 → 랜덤 스파클 별 선택
  const lastKeyRef = useRef<string|number|null>(null);
  useEffect(() => {
    if (answerSignal == null || answerSignal === lastKeyRef.current) return;
    lastKeyRef.current = answerSignal;
    const stars = starsRef.current;
    if (!stars.length) return;
    const marginX = 32, marginY = 48;
    const safe = stars.filter(s => s.x > marginX && s.y > marginY);
    const chosen = (safe.length ? safe : stars)[Math.floor(Math.random() * (safe.length ? safe.length : stars.length))];
    setCelebrateId(chosen.id);
    celebrateUntilRef.current = performance.now() + 8000;
    const timer = setTimeout(()=>setCelebrateId(null), 8200);
    return () => clearTimeout(timer);
  }, [answerSignal]);

  // 클릭 판별
  function tryHitCelebrationStar(evt: React.MouseEvent) {
    if (!celebrateId) return false;
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const s = starsRef.current.find(s => s.id === celebrateId);
    if (!s) return false;
    const dx = x - s.x, dy = y - s.y;
    return Math.sqrt(dx*dx + dy*dy) <= Math.max(16, s.r*6);
  }

  function onContainerClick(e: React.MouseEvent) {
    const moonEl = moonRef.current;
    if (moonEl && (e.target instanceof Node) && moonEl.contains(e.target as Node)) return;
    if (bottomBarSelector) {
      const bar = document.querySelector(bottomBarSelector);
      if (bar && (e.target instanceof Node) && bar.contains(e.target as Node)) return;
    }
    if (tryHitCelebrationStar(e)) { onOpenAnswer(); return; }
    onOpenEditor();
  }

  // === 달 밝기 조절: 길게 누르고 위/아래 드래그 ===
  const moonLP = useLongPress((ev) => {
    const startY = (ev as PointerEvent).clientY;
    let current = moonBright;
    function onMove(e: PointerEvent) {
      const dy = (e.clientY - startY);
      const next = clamp(current - dy/300, 0.6, 1.6);
      setMoonBright(next); localStorage.setItem('moon_brightness', String(next));
    }
    function stop(e: PointerEvent) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }, { delay: 300 });

  // === 별 밀도 조절: 배경 길게 누르고 좌/우 드래그 (랜덤 리셋) ===
  const [showDensityHud, setShowDensityHud] = useState(false);
  const bgLP = useLongPress((ev) => {
    const startX = (ev as PointerEvent).clientX;
    const start = density;
    setShowDensityHud(true);
    function onMove(e: PointerEvent) {
      const dx = e.clientX - startX;
      const next = clamp(start + dx/500, 0.2, 1.2);
      if (Math.abs(next - density) > 0.01) {
        setDensity(next);
        localStorage.setItem('sky_density', String(next));
        // re-randomize positions by forcing stars reset on next frame: just reassign
        const stars = starsRef.current;
        for (let i=0;i<stars.length;i++) { stars[i].x = Math.random()* (canvasRef.current?.width||1); stars[i].y = Math.random()* (canvasRef.current?.height||1); }
      }
    }
    function stop(e: PointerEvent) {
      setTimeout(()=>setShowDensityHud(false), 400);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }, { delay: 400 });

  // 스타일 계산
  const bgStyle = useMemo(() => ({
    backgroundImage: [
      `radial-gradient(1200px 60% at 70% -10%, rgba(80,120,255,${0.15*moonBright}), rgba(0,0,0,0))`,
      `radial-gradient(800px 50% at 30% 20%, rgba(140,170,255,${0.10*moonBright}), rgba(0,0,0,0))`,
      'linear-gradient(180deg, #0A1640 0%, #081234 50%, #060e2a 100%)'
    ].join(','),
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover'
  }), [moonBright]);

  return (
    <div
      role="region"
      aria-label="Night sky"
      className="fixed inset-0 select-none"
      onClick={onContainerClick}
      {...bgLP}
      style={bgStyle}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      {/* 달 버튼 */}
      <button
        ref={moonRef}
        onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
        {...moonLP}
        aria-label="설정 열기"
        className="absolute rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300/70"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          width: `${56 * clamp(moonBright, 0.9, 1.3)}px`,
          height: `${56 * clamp(moonBright, 0.9, 1.3)}px`,
          background: `radial-gradient(40% 40% at 35% 35%, rgba(255,255,255,${0.95*moonBright}) 0%, rgba(240,246,255,${0.85*moonBright}) 40%, rgba(210,225,255,${0.75*moonBright}) 65%, rgba(180,200,255,${0.60*moonBright}) 85%, rgba(150,175,245,${0.35*moonBright}) 100%)`,
          boxShadow: `0 0 ${20*moonBright}px rgba(150,180,255,0.55), 0 0 ${50*moonBright}px rgba(120,160,255,0.25)`,
        }}
      >
        <span className="sr-only">Settings</span>
      </button>

      {/* 밀도 HUD */}
      {showDensityHud && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[max(24px,calc(env(safe-area-inset-bottom,0px)+24px))] px-3 py-1.5 rounded-full bg-black/30 text-white text-sm backdrop-blur">
          별 밀도 {Math.round(density*100)}%
        </div>
      )}
    </div>
  );
}
