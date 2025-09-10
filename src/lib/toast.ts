
type Toast = {
  id: string;
  text: string;
  ts: number;
  type: 'info' | 'success' | 'error' | 'warn';
};

type Sub = (items: Toast[]) => void;

let toasts: Toast[] = [];
const subs: Sub[] = [];

function broadcast() {
  for (const sub of subs) {
    try {
      sub([...toasts]);
    } catch (e) {
      console.error('toast broadcast error', e);
    }
  }
}

function add(type: Toast['type'], text: string) {
  const id = `toast-${Date.now()}-${Math.random()}`;
  toasts.push({ id, text, ts: Date.now(), type });
  toasts = toasts.slice(-5); // Keep last 5
  broadcast();

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    broadcast();
  }, 4000);
}

export const toast = {
  info: (text: string) => add('info', text),
  success: (text: string) => add('success', text),
  error: (text: string) => add('error', text),
  warn: (text: string) => add('warn', text),
};

export function subscribe(fn: Sub): () => void {
  subs.push(fn);
  // initial call
  fn([...toasts]);
  return () => {
    const i = subs.indexOf(fn);
    if (i > -1) {
      subs.splice(i, 1);
    }
  };
}
