type Toast = { id: string; text: string; ts: number };
type Sub = (items: Toast[]) => void;

const items: Toast[] = [];
const subs = new Set<Sub>();

export function pushToast(text: string){
  const t = { id: crypto.randomUUID(), text, ts: Date.now() };
  items.push(t); for (const s of subs) s(items.slice(-4));
  setTimeout(()=>{
    const i = items.findIndex(x=>x.id===t.id);
    if (i>=0) items.splice(i,1);
    for (const s of subs) s(items.slice(-4));
  }, 4000);
}

export function subscribe(fn: Sub){
  subs.add(fn); fn(items.slice(-4));
  return () => { subs.delete(fn); };
}
