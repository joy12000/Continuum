import React, { useEffect, useMemo, useState } from "react";
import { computeConnections, Note as GraphNote } from "@/lib/graph/computeConnections";

import { ConnectionsBadge } from "@/components/ConnectionsBadge";
import { ConnectionsPanel } from "@/components/ConnectionsPanel";
import { ConnectionsMiniGraph } from "@/components/ConnectionsMiniGraph";
import { ConnectionsWeights } from "@/components/ConnectionsWeights";
import { buildBacklinks } from "@/lib/graph/backlinks";
import { ConnectionsGraph } from "@/components/ConnectionsGraph";
import Modal from "@/components/Modal";

// Define a richer Note type for use within this timeline component
type TimelineNote = {
  id: string;
  title?: string;
  body?: string;
  content?: string; 
  created_at?: string;
  tags?: string[];
  citations?: { noteId: string }[];
};

function groupByDate(notes: TimelineNote[]) {
  const map = new Map<string, TimelineNote[]>();
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

const BacklinksPanel = ({ linkIds, notes }: { linkIds: string[], notes: TimelineNote[] }) => (
  <div className="rounded-lg border p-2 text-sm mt-2">
    <div className="mb-1 font-medium">이 노트를 참조함</div>
    <ul className="space-y-1">
      {linkIds.map(linkId => (
        <li key={linkId}>
          <button onClick={() => navigateToNote(linkId)} className="text-left hover:underline">
            {notes.find(n => n.id === linkId)?.title || linkId}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

export function LinksTimeline({ notes }: { notes: TimelineNote[] }) {
  const groups = useMemo(() => groupByDate(notes), [notes]);
  const backlinks = useMemo(() => buildBacklinks(notes as GraphNote[]), [notes]);
  const [vecById, setVecById] = useState<Map<string, number[]>>(new Map());
  const [openConnections, setOpenConnections] = useState<string | null>(null);
  const [openBacklinks, setOpenBacklinks] = useState<string | null>(null);
  const [isGraphModalOpen, setGraphModalOpen] = useState(false);
  const [weights, setWeights] = useState({ citation: 1.0, sim: 0.6, tag: 0.2 });

  const fullGraphData = useMemo(() => {
    const graphNodes = notes.map(n => ({ id: n.id, title: n.title || n.id }));
    const graphLinks: { source: string; target: string; score: number }[] = [];
    notes.forEach(note => {
      const neighbors = computeConnections(note as GraphNote, notes as GraphNote[], new Map(), weights, 10);
      neighbors.forEach(neighbor => {
        if (note.id < neighbor.toId) { // Prevent duplicate links
          graphLinks.push({ source: note.id, target: neighbor.toId, score: neighbor.score });
        }
      });
    });
    return { nodes: graphNodes, links: graphLinks };
  }, [notes, weights]);

  return (
    <div>
      <div className="my-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <ConnectionsWeights value={weights} onChange={setWeights} />
        <div className="mt-4">
            <button onClick={() => setGraphModalOpen(true)} className="text-sm text-sky-400 hover:underline">
                전체 그래프 보기
            </button>
        </div>
      </div>

      {isGraphModalOpen && (
        <Modal title="전체 노트 연결망" onClose={() => setGraphModalOpen(false)} actions={<></>}>
            <ConnectionsGraph nodes={fullGraphData.nodes} links={fullGraphData.links} onSelect={id => navigateToNote(id)} />
        </Modal>
      )}

      {groups.map(({ date, items }) => (
        <section key={date} className="mb-6">
          <h3 className="mb-2 text-sm text-neutral-500">{date}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((note) => {
              const neighbors = computeConnections(note as GraphNote, notes as GraphNote[], new Map(), weights, 4)
                .map(n => ({ ...n, title: notes.find(x => x.id === n.toId)?.title }));
              const noteBacklinks = backlinks.get(note.id) || [];
              const isConnectionsOpen = openConnections === note.id;
              const isBacklinksOpen = openBacklinks === note.id;

              return (
                <article key={note.id} className="rounded-xl border p-3 flex flex-col">
                  <div className="flex-grow">
                    <h4 className="font-medium">{note.title || note.id}</h4>
                    <p className="mt-1 line-clamp-3 text-sm text-neutral-700">{note.content || note.body}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ConnectionsBadge count={neighbors.length} onClick={() => setOpenConnections(isConnectionsOpen ? null : note.id)} />
                      <ConnectionsBadge count={noteBacklinks.length} onClick={() => setOpenBacklinks(isBacklinksOpen ? null : note.id)} />
                    </div>
                    <ConnectionsMiniGraph
                      selfId={note.id}
                      neighbors={neighbors.slice(0, 4).map(n => ({ id: n.toId, score: n.score }))}
                    />
                  </div>
                  {isConnectionsOpen && (
                    <div className="mt-2">
                      <ConnectionsPanel neighbors={neighbors} onSelect={(id) => navigateToNote(id)} />
                    </div>
                  )}
                  {isBacklinksOpen && <BacklinksPanel linkIds={noteBacklinks} notes={notes} />}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}