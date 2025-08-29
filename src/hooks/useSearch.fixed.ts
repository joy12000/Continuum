import { useState, useEffect, useRef } from 'react';
import { getQueryEmbedding } from '../lib/embeddings/getQueryEmbedding';
import { searchChunks } from '../lib/search/searchChunks';

type Row = { note_id: string; chunk_index?: number; content: string; distance?: number; score?: number; note?: any };

export function useSearchFixed(limit = 12) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        const qEmb = await getQueryEmbedding(query, { signal: ac.signal });
        const rows = await searchChunks({ qEmb, limit, signal: ac.signal });
        const rs = (rows || []).map((r: any) => ({
          note_id: r.note_id,
          chunk_index: r.chunk_index,
          content: r.content,
          distance: typeof r.distance === 'number' ? r.distance : (typeof r.score === 'number' ? r.score : undefined),
          score: 1 / (1 + (typeof r.distance === 'number' ? r.distance : 0) + 0.1),
          note: r.note,
        }));
        rs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        setResults(rs);
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, limit]);

  return { query, setQuery, results, loading };
}
