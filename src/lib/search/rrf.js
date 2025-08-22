export function rrfFuse(lists, k = 60) {
    const rankMaps = lists.map(list => {
        const map = new Map();
        list.forEach((item, idx) => map.set(item.id, idx + 1)); // rank starts at 1
        return map;
    });
    const allIds = new Set(lists.flat().map(x => x.id));
    const fused = new Map();
    for (const id of allIds) {
        let s = 0;
        for (const rm of rankMaps) {
            const r = rm.get(id);
            if (r != null)
                s += 1 / (k + r);
        }
        fused.set(id, s);
    }
    return Array.from(fused.entries()).sort((a, b) => b[1] - a[1]).map(([id, score]) => ({ id, score }));
}
