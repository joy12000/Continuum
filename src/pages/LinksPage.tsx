import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Note } from '../lib/db';
import { ConnectionsPanel } from '../components/ConnectionsPanel';
import { ConnectionsGraph } from '../components/ConnectionsGraph';
import { ConnectionsWeights, Weights } from '../components/ConnectionsWeights';
import { computeConnections, VecMap } from '../lib/graph/computeConnections';
import { getEmbeddingsMap } from '../lib/embeddings/getEmbeddingsMap';

const LinksPage = () => {
  const [weights, setWeights] = useState<Weights>({ citation: 1.0, sim: 0.6, tag: 0.2 });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [vecById, setVecById] = useState<VecMap>(new Map());

  const notes = useLiveQuery(() => db.notes.toArray(), []);
  const notesById = useMemo(() => {
    const map = new Map<string, Note>();
    for (const note of notes || []) {
      map.set(note.id, note);
    }
    return map;
  }, [notes]);

  useEffect(() => {
    if (notes?.length) {
      getEmbeddingsMap(notes).then(setVecById);
    }
  }, [notes]);

  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notesById.get(selectedNoteId) || null;
  }, [selectedNoteId, notesById]);

  const neighbors = useMemo(() => {
    if (!selectedNote || !notes || vecById.size === 0) {
      return [];
    }
    return computeConnections(selectedNote, notes, vecById, weights);
  }, [selectedNote, notes, vecById, weights]);

  // ConnectionsPanel에 전달할 데이터로 변환
  const panelNeighbors = useMemo(() => 
    neighbors.map(n => ({
      ...n,
      title: notesById.get(n.toId)?.title || n.toId,
    })),
  [neighbors, notesById]);

  // ConnectionsGraph에 전달할 데이터로 변환
  const { graphNodes, graphLinks } = useMemo(() => {
    if (!selectedNote) return { graphNodes: [], graphLinks: [] };

    const neighborNodes = neighbors
      .map(n => notesById.get(n.toId))
      .filter((n): n is Note => !!n);

    const graphNodes = [selectedNote, ...neighborNodes].map(n => ({ id: n.id, title: n.title }));
    const graphLinks = neighbors.map(n => ({ source: selectedNote.id, target: n.toId, weight: n.score }));

    return { graphNodes, graphLinks };
  }, [selectedNote, neighbors, notesById]);

  return (
    <div className="p-4 flex flex-col md:flex-row gap-4 h-full">
      <div className="md:w-1/4 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Select a Note</h1>
        <div className="overflow-y-auto border rounded-lg p-2 h-64 md:h-auto flex-grow">
          {(notes || []).map(note => (
            <div 
              key={note.id} 
              className={`p-2 rounded cursor-pointer ${selectedNoteId === note.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              onClick={() => setSelectedNoteId(note.id)}
            >
              {note.title || 'Untitled Note'}
            </div>
          ))}
        </div>
        <ConnectionsWeights value={weights} onChange={setWeights} />
      </div>

      <div className="md:w-3/4 flex flex-col gap-4">
        <div className="flex-grow h-96 md:h-auto">
          <ConnectionsGraph nodes={graphNodes} links={graphLinks} onSelect={setSelectedNoteId} />
        </div>
        <ConnectionsPanel neighbors={panelNeighbors} onSelect={setSelectedNoteId} />
      </div>
    </div>
  );
};

export default LinksPage;