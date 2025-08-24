import React, { useEffect, useState } from "react";
import { db } from "../lib/db";

function todayKey(){ return new Date().toISOString().slice(0,10); }

export default function TomorrowBox(){
  const [text, setText] = useState("");
  const [notify, setNotify] = useState(false);
  const [saving, setSaving] = useState(false);
  const date = todayKey();

  useEffect(()=>{
    (async ()=>{
      try{
        // @ts-ignore day_index may not exist before migration; ignore errors
        const row = await (db as any).day_index?.get(date);
        if (row){ setText(row.tomorrow || ""); setNotify(!!row.notify); }
      }catch{}
    })();
  }, [date]);

  async function save(){
    setSaving(true);
    try{
      const row = { date, tomorrow: text, notify, updatedAt: Date.now() };
      // @ts-ignore
      await (db as any).day_index?.put(row);
    }finally{
      setSaving(false);
    }
  }

  return (
    <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-2">
      <header className="flex items-center justify-between">
        <h4 className="font-semibold">Tomorrow</h4>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)} />
          아침 알림
        </label>
      </header>
      <input className="w-full rounded-lg bg-slate-900/50 border border-slate-700 p-2 text-sm"
        placeholder="내일 한 줄 약속" value={text} onChange={e=>setText(e.target.value)} />
      <div className="flex justify-end">
        <button className="btn" onClick={save} disabled={saving}>저장</button>
      </div>
    </section>
  );
}
