export function GeneratedAnswer({ summary, bullets, cites, onJump }:{ summary: string; bullets: string[]; cites?: {id:string, text:string}[]; onJump?: (id:string)=>void }){
  return (<div className="space-y-2">
    <div className="font-medium">{summary}</div>
    <ul className="list-disc ml-5">{bullets.map((b,i)=>(<li key={i}>{b}</li>))}</ul>
    {(cites?.length??0)>0 && (<div className="text-sm opacity-80">출처:
      <ul className="list-disc ml-5">{cites!.map((c,i)=>(<li key={i}><button onClick={()=>onJump?.(c.id)} className="underline">{c.id}</button>: {c.text}</li>))}</ul>
    </div>)}
  </div>);
}