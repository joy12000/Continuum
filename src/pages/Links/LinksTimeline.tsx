import React, { useEffect, useMemo, useState } from "react";
import { computeConnections } from "@/lib/graph/computeConnections";
import { getEmbeddingsMap } from "@/lib/embeddings/getEmbeddingsMap";
import { ConnectionsBadge } from "@/components/ConnectionsBadge";
import { ConnectionsPanel } from "@/components/ConnectionsPanel";
import { ConnectionsMiniGraph } from "@/components/ConnectionsMiniGraph";

type Note = { id: string; title?: string; body?: string; content?: string; created_at?: string; tags?: string[] };

function groupByDate(notes: Note[]) {
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    const d = (n.created_at || "").slice(0, 10) || "unknown";
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(n);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function navigateToNote(id: string) {
  if (typeof window !== "undefined") window.location.href = `/notes/${id}`;
}

export function LinksTimeline({ notes }: { notes: Note[] }) {
  const groups = useMemo(() => groupByDate(notes), [notes]);
  const [vecById, setVecById] = useState<Map<string, number[]>>(new Map());
  const [openFor, setOpenFor] = useState<string | null>(null);
  const weights = { citation: 1.0, sim: 0.6, tag: 0.2 } as const;

  useEffect(() => {
    let alive = true;
    (async () => {
      const map = await getEmbeddingsMap(notes);
      if (alive) setVecById(map);
    })();
    return () => { alive = false; };
  }, [notes]);

  return (
    <div>
      {groups.map(({ date, items }) => (
        <section key={date} className="mb-6">
          <h3 className="mb-2 text-sm text-neutral-500">{date}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((note) => {
              const neighbors = computeConnections(note as any, notes as any, vecById, weights, 4)
                .map(n => ({ ...n, title: notes.find(x => x.id === n.toId)?.title }));
              const isOpen = openFor === note.id;
              return (
                <article key={note.id} className="rounded-xl border p-3">
                  <h4 className="font-medium">{note.title || note.id}</h4>
                  <p className="mt-1 line-clamp-3 text-sm text-neutral-700">{note.content || note.body}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <ConnectionsBadge count={neighbors.length} onClick={() => setOpenFor(isOpen ? null : note.id)} />
                    <ConnectionsMiniGraph
                      selfId={note.id}
                      neighbors={neighbors.slice(0, 4).map(n => ({ id: n.toId, score: n.score }))}
                    />
                  </div>
                  {isOpen && (
                    <div className="mt-2">
                      <ConnectionsPanel neighbors={neighbors} onSelect={(id) => navigateToNote(id)} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
