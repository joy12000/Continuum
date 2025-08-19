
export function rrfFuse(
  lists: Array<Array<{ id: string; score?: number }>>,
  k = 60
): { id: string; score: number }[] {
  const rankMaps = lists.map(list => {
    const map = new Map<string, number>();
    list.forEach((item, idx) => map.set(item.id, idx + 1)); // rank starts at 1
    return map;
  });
  const allIds = new Set<string>(lists.flat().map(x => x.id));
  const fused = new Map<string, number>();
  for (const id of allIds) {
    let s = 0;
    for (const rm of rankMaps) {
      const r = rm.get(id);
      if (r != null) s += 1 / (k + r);
    }
    fused.set(id, s);
  }
  return Array.from(fused.entries()).sort((a,b) => b[1] - a[1]).map(([id, score]) => ({ id, score }));
}
