
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getEmbedding } from './lib/generativeai';
import { BM25 } from '../server-lib/lib/bm25';
import { rrf } from './lib/rrf';
import { tokenize } from './lib/tokenizer';

export const config = { runtime: 'nodejs' };

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Placeholder for snippet generation
function generateSnippet(text: string, query: string): string {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text.slice(0, 150) + '...';
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + 50);
  const snippet = text.slice(start, end);
  return `...${snippet.replace(new RegExp(query, 'ig'), '<em>$&</em>')}...`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }

    // --- Parallel Hybrid Search ---
    const [semanticResults, keywordResults] = await Promise.all([
      // 1. Semantic Search
      (async () => {
        const queryEmbedding = await getEmbedding(q);
        const { data } = await supabase.rpc('match_notes', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7, // a reasonable default
          match_count: 20,
        });
        return data || [];
      })(),

      // 2. Keyword Search (BM25)
      (async () => {
        const { data: notes } = await supabase.from('notes').select('id, body');
        if (!notes) return [];
        const tokenizedDocs = notes.map(n => tokenize(n.body));
        const bm25 = new BM25(tokenizedDocs);
        const queryTokens = tokenize(q);
        const scores = bm25.search(queryTokens);
        return scores.map((score, i) => ({ id: notes[i].id, score })).filter(r => r.score > 0);
      })(),
    ]);

    // 3. Reciprocal Rank Fusion (RRF)
    const fusedResults = rrf([keywordResults, semanticResults]);

    // 4. Fetch details and generate snippets for top results
    const topIds = fusedResults.slice(0, 10).map(r => r.id);
    const { data: finalNotes } = await supabase.from('notes').select('id, title, body').in('id', topIds);

    const response = fusedResults.slice(0, 10).map(fused => {
      const note = finalNotes?.find(n => n.id === fused.id);
      return {
        note_id: fused.id,
        title: note?.title || 'Untitled',
        score: fused.score,
        snippet_html: note ? generateSnippet(note.body, q) : '',
      };
    });

    return res.status(200).json(response);

  } catch (e: any) {
    console.error('[api/search] Error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
