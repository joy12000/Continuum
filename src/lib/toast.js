const items = [];
const subs = new Set();
function pushToast(text, type = 'info') {
    const t = { id: crypto.randomUUID(), text, ts: Date.now(), type };
    items.push(t);
    for (const s of subs)
        s(items.slice(-5)); // Show up to 5 toasts
    setTimeout(() => {
        const i = items.findIndex(x => x.id === t.id);
        if (i >= 0)
            items.splice(i, 1);
        for (const s of subs)
            s(items.slice(-5));
    }, 5000); // Keep toast for 5 seconds
}
export const toast = {
    info: (text) => pushToast(text, 'info'),
    success: (text) => pushToast(text, 'success'),
    error: (text) => pushToast(text, 'error'),
    warn: (text) => pushToast(text, 'warn'),
};
export function subscribe(fn) {
    subs.add(fn);
    fn(items.slice(-5));
    return () => {
        subs.delete(fn);
    };
}
