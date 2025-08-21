export function cosine(a: number[], b: number[]): number { let s=0,na=0,nb=0; const L=Math.max(a.length,b.length); for(let i=0;i<L;i++){const x=a[i]||0,y=b[i]||0;s+=x*y;na+=x*x;nb+=y*y;} if(!na||!nb) return 0; return s/Math.sqrt(na*nb); }
export function mmrSelect(items: { id:string, vec:number[], score:number }[], qvec: number[], k: number, lambda=0.4) {
  const selected: typeof items = []; const pool = items.slice().sort((a,b)=>b.score-a.score);
  while (selected.length<k && pool.length){ let best=pool[0], bestScore=-1e9, bestIdx=0;
    for (let i=0;i<pool.length;i++){ const c=pool[i]; const rel=cosine(c.vec,qvec); let red=0; for(const s of selected) red=Math.max(red,cosine(c.vec,s.vec));
      const m=lambda*rel-(1-lambda)*red+1e-6*c.score; if(m>bestScore){bestScore=m; best=c; bestIdx=i;} }
    selected.push(best); pool.splice(bestIdx,1);
  } return selected;
}
