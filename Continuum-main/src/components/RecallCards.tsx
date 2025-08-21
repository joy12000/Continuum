
import { useMemo } from "react";
import { Note } from "../lib/db";


function safeDate(v: any): Date {
  const n = typeof v === "number" ? v : Date.parse(String(v || 0));
  const d = new Date(isNaN(n) ? 0 : n);
  return d;
}
function sameMonthDay(a: Date, b: Date) {

  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function RecallCards({ notes = [], onClickTag, setQuery }: { notes?: Note[]; onClickTag: (t: string) => void; setQuery: (q: string) => void; }) {
  const today = new Date();
  const todayNotes = useMemo(
    () => (Array.isArray(notes) ? notes : []).filter(n => safeDate(n?.createdAt).toDateString() === today.toDateString()),
    [notes]
  );

  const lastYearToday = useMemo(() => {
    const ly = new Date(today);
    ly.setFullYear(today.getFullYear() - 1);
    return (Array.isArray(notes) ? notes : []).filter(n => sameMonthDay(safeDate(n?.createdAt), ly));
  }, [notes]);

  const threads = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of notes) {
      const t = n.tags[0];
      if (!t) continue;
      map.set(t, (map.get(t) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a,b) => b[1]-a[1]).slice(0, 6);
  }, [notes]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="card">
        <div className="text-sm opacity-80 mb-1">오늘</div>
        <div className="text-2xl font-bold">{todayNotes.length}</div>
        <div className="text-sm text-slate-400">오늘 작성한 노트</div>
        <button className="btn mt-3" onClick={() => setQuery(``)}>모두 보기</button>
      </div>
      <div className="card">
        <div className="text-sm opacity-80 mb-1">작년 오늘</div>
        <div className="text-2xl font-bold">{lastYearToday.length}</div>
        <div className="text-sm text-slate-400">작년 같은 날의 기록</div>
        <button className="btn mt-3" onClick={() => setQuery(``)}>모두 보기</button>
      </div>
      <div className="card">
        <div className="text-sm opacity-80 mb-2">인기 스레드(태그)</div>
        <div className="flex flex-wrap gap-2">
          {threads.map(([t, c]) => (
            <button key={t} className="px-2 py-1 rounded-lg bg-slate-700 text-xs" onClick={() => onClickTag(t)}>
              #{t} <span className="opacity-60">({c})</span>
            </button>
          ))}
          {threads.length === 0 && <div className="text-slate-400 text-sm">태그가 아직 없어요</div>}
        </div>
      </div>
    </div>
  );
}
