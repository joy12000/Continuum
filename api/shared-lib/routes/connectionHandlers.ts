import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../auth.js';
import type { Note, NoteChunk } from '../types.js';
import {
  prepareNotes,
  cluster,
  clusterLPA,
  clusterByAutoThreshold,
  clusterHybrid,
} from '../compute.js';
import { pickSupabase, envNum, envBool01 } from '../config.js';

export async function handleFindContextCluster(req: VercelRequest, res: VercelResponse) {
  try {
    const noteId = req.query.noteId as string;
    if (!noteId) {
      return res.status(400).json({ error: 'noteId is required.' });
    }
    const token = req.headers.authorization?.split(' ')?.[1];
    if (!token) {
      return res.status(401).json({ error: 'Missing auth token.' });
    }
    const supabase = pickSupabase(req);
    if (!supabase) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { data: notes, error: nerr } = await supabase
      .from('notes')
      .select('id,title,body,tags,created_at,updated_at')
      .order('created_at', { ascending: true });
    if (nerr) throw new Error(`Failed to fetch notes: ${nerr.message}`);
    const noteIds = (notes ?? []).map((n: any) => n.id);
    if (!noteIds.length) {
      return res.status(200).json({ contextNoteIds: [] });
    }
    const { data: chunks, error: cerr } = await supabase
      .from('note_chunks')
      .select('note_id,embedding')
      .in('note_id', noteIds);
    if (cerr) throw new Error(`Failed to fetch chunk embeddings: ${cerr.message}`);

    const prepared = prepareNotes(notes as Note[], (chunks as NoteChunk[]) ?? []);
    const minEdge = envNum('CONTINUUM_MIN_EDGE', 0.02);
    const { data: edges, error: edgesError } = await supabase.rpc('get_all_edges', {
      minimum_weight: minEdge,
    });
    if (edgesError) throw new Error(`Failed to build edges: ${edgesError.message}`);

    const method = String(process.env.CONTINUUM_CLUSTER_METHOD ?? 'hybrid').toLowerCase();
    let clusters: number[][];
    if (method === 'legacy') {
      clusters = cluster(prepared, edges as any).clusters;
    } else if (method === 'lpa') {
      clusters = clusterLPA(prepared, edges as any, {
        minEdge: 0,
        minClusterSize: 2,
      }).clusters;
    } else if (method === 'auto') {
      const kMin = envNum('CONTINUUM_KMIN', 3);
      const kMax = envNum('CONTINUUM_KMAX', 12);
      clusters = clusterByAutoThreshold(prepared, edges as any, { kMin, kMax }).clusters;
    } else {
      const kMin = envNum('CONTINUUM_KMIN', 4);
      const kMax = envNum('CONTINUUM_KMAX', 12);
      const knnK = Math.max(1, Math.min(64, envNum('CONTINUUM_CLUSTER_K', 8)));
      const mutual = envBool01('CONTINUUM_CLUSTER_MUTUAL', true);
      clusters = clusterHybrid(prepared, edges as any, {
        kMin,
        kMax,
        minEdge: 0,
        minClusterSize: 2,
        knnK,
        mutual,
      }).clusters;
    }

    const noteIndex = prepared.findIndex((p) => p.note.id === noteId);
    let contextCluster: number[] = noteIndex !== -1 ? [noteIndex] : [];
    if (noteIndex !== -1) {
      const foundCluster = clusters.find((c) => c.includes(noteIndex));
      if (foundCluster) contextCluster = foundCluster;
    }

    const contextNoteIds = contextCluster.map((idx) => prepared[idx].note.id);
    return res.status(200).json({ contextNoteIds });
  } catch (e: any) {
    console.error(`handleFindContextCluster failed:`, e);
    return res.status(500).json({ error: e.message });
  }
}

export async function handleGetBacklinks(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
  const noteId = req.query.noteId as string;
  if (!noteId) {
    return res.status(400).json({ error: "Missing noteId" });
  }
  const { data, error } = await supabase
    .from("note_links")
    .select("from_note_id,to_note_id,notes!note_links_from_note_id_fkey(id,title)")
    .eq("to_note_id", noteId);
  if (error) {
    return res.status(500).json({ error: "Failed to fetch backlinks", detail: error.message });
  }
  res.status(200).json({ backlinks: data ?? [] });
}

export async function handleGetConnections(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;
  const { data, error } = await supabase.rpc('get_note_connections', {
    uid: userId,
  });
  if (error) {
    return res.status(500).json({ error: "Failed to fetch connections", detail: error.message });
  }
  res.status(200).json({ connections: data ?? [] });
}
