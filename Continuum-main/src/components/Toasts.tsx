import { useEffect, useState } from "react";
import { subscribe } from "../lib/toast";

export function Toasts(){
  const [items, setItems] = useState<{id:string; text:string; ts:number}[]>([]);
  useEffect(()=> subscribe(setItems), []);
  return (
    <div style={{ position:"fixed", right: 12, bottom: 12, display:"grid", gap: 8, zIndex: 50 }}>
      {items.map(t=>(
        <div key={t.id} className="card" style={{ background:"#111827cc", borderColor:"#374151" }}>{t.text}</div>
      ))}
    </div>
  );
}
