import { useMemo } from "react";

export function AnswerCard({ kp, cites, onJump }:{ kp:string[]; cites:{ text:string; noteId:string; pos:number; tags:string[]; createdAt:number; }[]; onJump?:(id:string)=>void; }){
  const grouped = useMemo(()=>{
    const m = new Map<string,{noteId:string; snippets:string[]; tags:string[]; createdAt:number; }>();
    for (const c of cites){
      const g = m.get(c.noteId) || { noteId:c.noteId, snippets:[], tags:c.tags, createdAt:c.createdAt };
      g.snippets.push(c.text); m.set(c.noteId, g);
    }
    return Array.from(m.values());
  },[cites]);

  return (
    <div className="card">
      <div className="small">추출형 답 · 출처 포함</div>
      <ul className="list-disc pl-5">
        {kp.map((s,i)=><li key={i}>{s}</li>)}
      </ul>
      <div className="small" style={{marginTop:8}}>인용/출처</div>
      <div className="grid">
        {grouped.map(g=>(
          <div key={g.noteId} className="card">
            <div className="small">노트 {g.noteId.slice(0,8)} · {new Date(g.createdAt||0).toLocaleDateString()}</div>
            <ul className="list-disc pl-5">
              {g.snippets.slice(0,3).map((s,i)=><li key={i}>{s}</li>)}
            </ul>
            {onJump && <button className="btn" onClick={()=>onJump(g.noteId)} style={{marginTop:6}}>노트 열기</button>}
          </div>
        ))}
      </div>
      {grouped.length===0 && <div className="small">명확한 근거 없음 — 유사 항목만.</div>}
    </div>
  );
}
