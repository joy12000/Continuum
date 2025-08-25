
import React, { useMemo } from "react";

type Note = { id?: number; content: string; createdAt: number; updatedAt?: number; tags?: string[] };

interface Props {
  year: number;
  month: number; // 0-based
  weekLabels: string[];
  notesByDate: Record<string, Note[]>;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (k: string) => void;
}

function ymd(d: Date){const y=d.getFullYear();const m=(d.getMonth()+1).toString().padStart(2,"0");const dd=d.getDate().toString().padStart(2,"0");return `${y}-${m}-${dd}`;}

const CalendarMonth: React.FC<Props> = ({ year, month, weekLabels, notesByDate, selectedDate, onSelectDate }) => {
  const cells = useMemo(()=>{
    const first=new Date(year,month,1);
    const startWeekday=first.getDay();
    const daysInMonth=new Date(year,month+1,0).getDate();
    const prevDays=startWeekday;
    const total=Math.ceil((prevDays+daysInMonth)/7)*7;
    const arr: { key:string; inMonth:boolean; date:number }[] = [];
    const startDate=new Date(year,month,1-prevDays);
    for(let i=0;i<total;i++){ const d=new Date(startDate); d.setDate(startDate.getDate()+i); arr.push({ key:ymd(d), inMonth:d.getMonth()===month, date:d.getDate() }); }
    return arr;
  },[year,month]);

  const todayKey = ymd(new Date());

  return (
    <div className="cal-grid">
      <div className="cal-weekhead">{weekLabels.map((w,i)=>(<div key={i} className={`wcell ${i===0?"sun":""} ${i===6?"sat":""}`}>{w}</div>))}</div>
      <div className="cal-cells">
        {cells.map((c)=>{
          const list=notesByDate[c.key]||[];
          const active=c.key===selectedDate;
          const today=c.key===todayKey;
          return (
            <button key={c.key} className={`ccell ${active?"active":""} ${today?"today":""} ${c.inMonth?"":"dim"}`}
              onClick={()=>onSelectDate(c.key)} aria-current={active?"date":undefined} aria-label={`${year}년 ${month + 1}월 ${c.date}일, 노트 ${list.length}개`}>
              <span className="date">{c.date}</span>
              <span className="dots" aria-hidden="true">
                {list.slice(0,3).map((_,i)=><i key={i} className="dot" />)}
                {list.length>3 && <i className="more">+{list.length-3}</i>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default CalendarMonth;
