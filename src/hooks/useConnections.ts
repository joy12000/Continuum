import { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Note } from '../lib/db';
import { Weights } from '../components/ConnectionsWeights';
import { VecMap } from '../lib/graph/computeConnections';
import { getEmbeddingsMap } from '../lib/embeddings/getEmbeddingsMap';

export const useConnections = () => {
  const [weights, setWeights] = useState<Weights>({ citation: 1.0, sim: 0.6, tag: 0.2 });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [vecById, setVecById] = useState<VecMap>(new Map());
  const [neighbors, setNeighbors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  // 1. Worker 초기화 및 메시지 리스너 설정
  useEffect(() => {
    const worker = new Worker(new URL('../workers/semanticWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const { ok, result } = event.data;
      if (ok) {
        setNeighbors(result);
      }
      setLoading(false);
    };

    return () => {
      worker.terminate();
    };
  }, []);

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

  // 2. Worker에게 연관 노트 계산 요청
  useEffect(() => {
    if (selectedNote && notes && vecById.size > 0 && workerRef.current) {
      setLoading(true);
      workerRef.current.postMessage({
        type: 'compute_connections',
        payload: {
          note: selectedNote,
          notes,
          vecByIdObject: Object.fromEntries(vecById),
          weights,
        },
      });
    }
  }, [selectedNote, notes, vecById, weights]);

  const panelNeighbors = useMemo(() => 
    neighbors.map(n => ({
      ...n,
      title: notesById.get(n.toId)?.title || n.toId,
    })),
  [neighbors, notesById]);

  const { graphNodes, graphLinks } = useMemo(() => {
    if (!selectedNote) return { graphNodes: [], graphLinks: [] };

    const neighborNotes = neighbors
      .map(n => notesById.get(n.toId))
      .filter((n): n is Note => !!n);

    const graphNodes = [selectedNote, ...neighborNotes].map(n => ({ id: n.id, title: n.title }));
    const graphLinks = neighbors.map(n => ({ source: selectedNote.id, target: n.toId, weight: n.score }));

    return { graphNodes, graphLinks };
  }, [selectedNote, neighbors, notesById]);

  return {
    notes,
    weights,
    setWeights,
    selectedNoteId,
    setSelectedNoteId,
    panelNeighbors,
    graphNodes,
    graphLinks,
    loading,
  };
};