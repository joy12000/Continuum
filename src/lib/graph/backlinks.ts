import type { Note } from './computeConnections';
export function buildBacklinks(notes: Note[]) {
  const incoming = new Map<string, string[]>();
  for (const n of notes) {
    const out = (n.citations || []).map(c => c.noteId);
    for (const target of out) {
      if (!incoming.has(target)) incoming.set(target, []);
      incoming.get(target)!.push(n.id);
    }
  }
  return incoming;
}
