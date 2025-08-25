
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type Star = { x:number; y:number; r:number; baseA:number; phase:number; speed:number; };

const clamp = (v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const dpr = () => (typeof window!=="undefined"? window.devicePixelRatio||1:1);
const SKY = ["#041326","#08284a","#0b315a"];
const K = { density: "sky.starDensity", brightness: "sky.brightness" };

export default function HomeSky(){
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const rafRef = useRef<number|null>(null);
  const starsRef = useRef<Star[]>([]);
  const [density,setDensity] = useState<number>(()=>{
    const v = Number(localStorage.getItem(K.density));
    return Number.isFinite(v)? clamp(v,0.2,2):1;
  });
  const [brightness,setBrightness] = useState<number>(()=>{
    const v = Number(localStorage.getItem(K.brightness));
    return Number.isFinite(v)? clamp(v,0.5,1.6):1.0;
  });
  const [showPanel,setShowPanel] = useState(false);
  const lp = useRef<number|null>(null);
  const nav = useNavigate();

  const regen = ()=>{
    const c = canvasRef.current; if(!c) return;
    const pr = dpr(); const w = Math.floor(c.clientWidth*pr); const h = Math.floor(c.clientHeight*pr);
    c.width = w; c.height = h;
    const base = Math.max(200, Math.floor((w*h)/(1100*1100)*900));
    const count = Math.floor(base*density);
    const arr:Star[] = new Array(count).fill(0).map(()=> ({
      x: Math.random()*w,
      y: Math.random()*h,
      r: Math.random()*pr*0.9 + 0.2*pr,
      baseA: Math.random()*0.35 + 0.25,
      phase: Math.random()*Math.PI*2,
      speed: Math.random()*0.9 + 0.2
    }));
    starsRef.current = arr;
  };

  useEffect(()=>{ regen(); const onR=()=>regen(); window.addEventListener("resize",onR); return ()=>window.removeEventListener("resize",onR); },[]);
  useEffect(()=>{ localStorage.setItem(K.density,String(density)); regen(); },[density]);
  useEffect(()=>{ localStorage.setItem(K.brightness,String(brightness)); },[brightness]);

  useEffect(()=>{
    const c = canvasRef.current; if(!c) return; const ctx = c.getContext("2d"); if(!ctx) return;
    const pr = dpr(); let t0 = performance.now();
    const loop = (t:number)=>{
      const w = c.width, h = c.height;
      // sky gradient
      const g = ctx.createLinearGradient(0,0,0,h);
      g.addColorStop(0, SKY[0]); g.addColorStop(0.65, SKY[1]); g.addColorStop(1, SKY[2]);
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

      // stars
      ctx.save(); ctx.globalCompositeOperation="lighter";
      const stars = starsRef.current;
      for(let i=0;i<stars.length;i++){
        const s = stars[i];
        const twinkle = 0.55 + 0.45*Math.sin(t*0.0015*s.speed + s.phase);
        const a = clamp(s.baseA*twinkle*brightness,0,1);
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle="#cfe8ff"; ctx.fill();
        ctx.globalAlpha = a*0.35; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*2.2,0,Math.PI*2); ctx.fillStyle="#a3c7ff"; ctx.fill();
      }
      ctx.restore();

      // ground
      const gh = Math.max(60*pr, Math.floor(h*0.13));
      ctx.save(); ctx.translate(0,h-gh);
      const gg = ctx.createLinearGradient(0,0,0,gh);
      gg.addColorStop(0,"rgba(0,0,0,0.0)"); gg.addColorStop(0.35,"rgba(0,0,0,0.35)"); gg.addColorStop(1,"rgba(0,0,0,0.9)");
      ctx.fillStyle = gg; ctx.fillRect(0,0,w,gh);
      ctx.beginPath(); ctx.moveTo(0, gh*0.55);
      ctx.quadraticCurveTo(w*0.35, gh*0.25, w*0.6, gh*0.6);
      ctx.quadraticCurveTo(w*0.8, gh*0.95, w, gh*0.7);
      ctx.lineTo(w, gh); ctx.lineTo(0, gh); ctx.closePath(); ctx.fillStyle="rgba(0,0,0,0.85)"; ctx.fill();
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
      t0 = t;
    };
    rafRef.current = requestAnimationFrame(loop);
    return ()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); };
  },[brightness]);

  const onMoonDown = ()=>{ if(lp.current) clearTimeout(lp.current); lp.current = window.setTimeout(()=> setShowPanel(true), 450); };
  const onMoonUp = ()=>{ if(lp.current) clearTimeout(lp.current); };
  const goSettings = ()=>{ if(!showPanel) nav("/settings"); };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      <button
        className="absolute top-3 right-3 size-9 md:size-10 rounded-full bg-gradient-to-b from-white to-gray-200 shadow-md border border-white/40 active:scale-95 transition"
        title="설정 (길게 눌러 별 밀도)"
        onClick={goSettings}
        onPointerDown={onMoonDown}
        onPointerUp={onMoonUp}
        onPointerCancel={onMoonUp}
      >
        <svg viewBox="0 0 24 24" className="w-full h-full p-2">
          <path d="M22 12.2A9.8 9.8 0 1 1 11.8 2a7.7 7.7 0 0 0 10.2 10.2z" fill="#f4f5ff" stroke="#e8ecff" strokeWidth="0.6"/>
        </svg>
      </button>

      {showPanel && (
        <div className="absolute top-14 right-3 z-20 w-60 rounded-xl bg-white/90 backdrop-blur p-3 shadow-xl border border-black/5 text-gray-800"
             onPointerUp={()=>setShowPanel(false)}>
          <div className="text-xs mb-2 font-medium">별 밀도</div>
          <input type="range" min={0.2} max={2} step={0.1} value={density} onChange={(e)=>setDensity(parseFloat(e.target.value))} className="w-full"/>
          <div className="text-xs mt-3 mb-2 font-medium">별 밝기</div>
          <input type="range" min={0.5} max={1.6} step={0.05} value={brightness} onChange={(e)=>setBrightness(parseFloat(e.target.value))} className="w-full"/>
          <div className="text-[10px] mt-2 text-gray-500">길게 눌러 열고, 탭하면 설정으로 이동</div>
        </div>
      )}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-6 md:gap-10 rounded-2xl bg-black/35 backdrop-blur px-5 py-2 text-white/90 border border-white/10 shadow-lg">
        <Tab label="홈" onClick={()=>nav("/")} d="M3 10l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/>
        <Tab label="달력" onClick={()=>nav("/calendar")} d="M7 3h10v2h3v16H4V5h3V3zm0 6h10M7 11h4m2 0h4M7 15h4m2 0h4"/>
        <Tab label="검색" onClick={()=>nav("/search")} d="M11 19a8 8 0 1 1 5.3-2.7l4.7 4.7-1.4 1.4-4.7-4.7A7.97 7.97 0 0 1 11 19z"/>
        <Tab label="연결" onClick={()=>nav("/links")} d="M7 12a5 5 0 0 1 5-5h3v2h-3a3 3 0 0 0 0 6h3v2h-3a5 5 0 0 1-5-5zm10-3a5 5 0 0 1 0 10h-3v-2h3a3 3 0 1 0 0-6h-3V9h3z"/>
      </div>

      <span className="sr-only">달을 길게 눌러 별 밀도와 밝기를 조절할 수 있습니다.</span>
    </div>
  );
}

function Tab({d,label,onClick}:{d:string;label:string;onClick:()=>void}){
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-xs hover:scale-105 active:scale-95 transition" aria-label={label}>
      <svg viewBox="0 0 24 24" className="w-6 h-6"><path d={d} fill="currentColor"/></svg>
      <span className="opacity-80">{label}</span>
    </button>
  );
}
