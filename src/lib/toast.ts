type Toast = { id: string; text: string; ts: number, type: 'info' | 'success' | 'error' | 'warn' };
type Sub = (items: Toast[]) => void;

const items: Toast[] = [];
const subs = new Set<Sub>();

function pushToast(text: string, type: Toast['type'] = 'info') {
  const t = { id: crypto.randomUUID(), text, ts: Date.now(), type };
  items.push(t);
  for (const s of subs) s(items.slice(-5)); // Show up to 5 toasts
  setTimeout(() => {
    const i = items.findIndex(x => x.id === t.id);
    if (i >= 0) items.splice(i, 1);
    for (const s of subs) s(items.slice(-5));
  }, 5000); // Keep toast for 5 seconds
}

export const toast = {
  info: (text: string) => pushToast(text, 'info'),
  success: (text: string) => pushToast(text, 'success'),
  error: (text: string) => pushToast(text, 'error'),
  warn: (text: string) => pushToast(text, 'warn'),
};

export function subscribe(fn: Sub) {
  subs.add(fn);
  fn(items.slice(-5));
  return () => {
    subs.delete(fn);
  };
}
