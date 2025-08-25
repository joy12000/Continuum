import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CalendarMonth from "../components/CalendarMonth";
import Toast from "../components/Toast";
import SkyBackground from "../components/SkyBackground";
import "../styles/calendar.css";
import "../styles/toast.css";

type Note = { id?: number; content: string; createdAt: number; updatedAt?: number; tags?: string[] };
function ymd(d: Date){const y=d.getFullYear();const m=(d.getMonth()+1).toString().padStart(2,"0");const dd=d.getDate().toString().padStart(2,"0");return `${y}-${m}-${dd}`}
function ymdFromTs(ts:number){return ymd(new Date(ts));}
function firstLine(s:string){const line=(s||"" ).split(/\r?\n/)[0].trim();return line || "제목 없음";}

const K_WEEK=["일","월","화","수","목","금","토"];
const K_MONTH=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const CalendarPage: React.FC = () => {
  const nav = useNavigate();
  const today = new Date();
  const [y, setY] = useState<number>(today.getFullYear());
  const [m, setM] = useState<number>(today.getMonth());
  const [notes, setNotes] = useState<Note[]>([]);
  const [selDate, setSelDate] = useState<string>(ymd(today));
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(()=>{(async()=>{
    setLoading(true);
    let arr: Note[] = [];
    try { const mod: any = await import("../lib/db").catch(()=>null); const db = mod?.default || mod; if (db?.notes) arr = await db.notes.orderBy("createdAt").toArray(); } catch {}
    if (!arr.length && (window as any).__notes) arr = (window as any).__notes as Note[];
    setNotes(arr||[]); setLoading(false);
  })();},[]);

  const mapByDate = useMemo(()=>{
    const map: Record<string, Note[]> = {}; for(const n of notes){ const k=ymdFromTs(n.createdAt); (map[k] ||= []).push(n); } return map;
  },[notes]);

  const onPrev=( )=>{
    const d=new Date(y,m,1);
    d.setMonth(d.getMonth()-1);
    setY(d.getFullYear());
    setM(d.getMonth());
  };
  const onNext=( )=>{
    const d=new Date(y,m,1);
    d.setMonth(d.getMonth()+1);
    setY(d.getFullYear());
    setM(d.getMonth());
  };
  const onToday=( )=>{
    const d=new Date();
    setY(d.getFullYear());
    setM(d.getMonth());
    setSelDate(ymd(d));
  };

  const monthTitle = `${K_MONTH[m]} ${y}`;
  const dayNotes = mapByDate[selDate] || [];

  const pasteToSky = (t:string)=>{
    window.dispatchEvent(new CustomEvent("sky:paste",{ detail:{ text:t } }));
    setToast({ message: "노트를 밤하늘에 불러왔습니다.", type: 'success' });
    setTimeout(() => {
      setToast(null);
      nav("/"); 
    }, 1800);
  };

  return (
    <div className="relative w-full h-full">
      <SkyBackground />
      <div className="calendar-wrap content-offset">
        <header className="cal-head">
          <div className="cal-title">
            <button aria-label="이전 달로 이동" onClick={onPrev}>‹</button>
            <h1>{monthTitle}</h1>
            <button aria-label="다음 달로 이동" onClick={onNext}>›</button>
          </div>
          <div className="cal-actions"><button onClick={onToday} aria-label="오늘 날짜로 이동">오늘</button></div>
        </header>

        <CalendarMonth year={y} month={m} weekLabels={K_WEEK} notesByDate={mapByDate} selectedDate={selDate} onSelectDate={setSelDate} />

        <section className="cal-detail" aria-live="polite">
          <div className="detail-head"><h2>{selDate}</h2>{!loading && <span className="count">{dayNotes.length}개 노트</span>}</div>
          <div className="detail-list">
            {loading && <div className="empty">로딩 중…</div>}
            {!loading && dayNotes.length===0 && <div className="empty">오늘의 이야기를 기록해 보세요.</div>}
            {dayNotes.map((n)=>(
              <article key={String(n.id)+n.createdAt} className="detail-item">
                <h3>{firstLine(n.content)}</h3>
                <p className="snippet">{(n.content||"").slice(0,160)}</p>
                <div className="detail-actions">
                  <button onClick={()=>pasteToSky(n.content)}>이어쓰기</button>
                  {n.id!=null && <button onClick={()=>window.dispatchEvent(new CustomEvent("open:note",{ detail:{ id:n.id } }))}>노트 열기</button>}
                </div>
              </article>
            ))}
          </div>
        </section>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
};
export default CalendarPage;
