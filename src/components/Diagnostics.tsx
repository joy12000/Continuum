import { useEffect, useState } from "react";
import { getSemanticAdapter } from "../lib/semantic";
import { db } from "../lib/db";

export function Diagnostics({ engine }:{ engine:"auto"|"remote" }){
  const [info, setInfo] = useState<any>({});
  useEffect(()=>{
    (async()=>{
      const a = await getSemanticAdapter(engine);
      const ok = await a.ensureReady();
      const count = await db.notes.count();
      const storage = (navigator as any)?.storage?.estimate ? await (navigator as any).storage.estimate() : null;
      setInfo({
        engine: engine, adapter: a.name, ready: ok,
        notes: count, quota: storage?.quota || null, usage: storage?.usage || null,
        ua: navigator.userAgent
      });
    })();
  },[engine]);
  return (
    <div className="card">
      <div className="small">진단</div>
      <pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(info, null, 2)}</pre>
    </div>
  );
}
