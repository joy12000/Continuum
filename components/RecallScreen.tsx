import React, { useEffect, useState } from "react";
import { db, Note } from "../lib/db";
import { RecallCards } from "./RecallCards";

export default function RecallScreen({ setQuery }:{ setQuery: (q:string)=>void; }){
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<{date:string; tomorrow:string}[]>([]);

  useEffect(()=>{
    let alive=true;
    (async ()=>{
      const ns = await db.notes.orderBy("updatedAt").reverse().toArray();
      const di = await (db as any).day_index?.toArray().catch(()=>[]) || [];
      if (!alive) return;
      setNotes(ns);
      setTodos(di.filter((r:any)=>r?.tomorrow).slice(-10).reverse()); // 최근 10개
    })();
    return ()=>{ alive=false; };
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">Recall</h2>
      <RecallCards notes={notes} onClickTag={(t)=>setQuery(t)} setQuery={setQuery} />
      {todos.length>0 && (
        <section className="space-y-2">
          <h4 className="font-semibold">미완료 약속 다시 보기</h4>
          <div className="grid gap-2">
            {todos.map(t=>(
              <div key={t.date} className="rounded-xl border border-slate-700 p-3">
                <div className="text-xs text-slate-400">{t.date}</div>
                <div className="text-sm">{t.tomorrow}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
