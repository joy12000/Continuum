import { useState, useEffect, useRef } from 'react';
import { getQueryEmbedding } from '../lib/embeddings/getQueryEmbedding';
import { searchChunks } from '../lib/search/searchChunks';
import { hybridScore, semanticScoreFromDistance } from '../lib/search/hybridScore';

export function useSearchPro({ limit = 12, alpha = 0.8, beta = 0.2 } = {}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
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
        const scored = (rows || []).map((r: any) => ({
          ...r,
          semScore: semanticScoreFromDistance(r.distance),
          finalScore: hybridScore({ distance: r.distance, text: r.content || '', query, alpha, beta }),
        }));
        scored.sort((a: any, b: any) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
        setResults(scored);
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, limit, alpha, beta]);

  return { query, setQuery, results, loading };
}
