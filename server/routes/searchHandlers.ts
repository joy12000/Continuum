import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TaskType } from '@google/generative-ai';
import { connectNewNote } from '../ai.js';
import { getEmbedding } from '../generativeai.js';
import { pickSupabase } from '../config.js';
import { withFileSearchContext } from '../fileSearchContext.js';
import { getUserFileSearchStoreName, getFileSearchStoreName, listUserFiles } from '../fileSearch.js';

export async function handleSearch(req: VercelRequest, res: VercelResponse) {
  try {
    const rawQ = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const q = (rawQ ?? '').toString().trim();
    if (!q) return res.status(200).json([]);

    const auth = await withFileSearchContext(req, res);
    if (!auth) return;

    const finalUid = auth.userId;

    const sb = pickSupabase(req);
    if (!sb) return res.status(401).json({ error: 'Authentication required.' });

    const qEmb = await getEmbedding(q, TaskType.RETRIEVAL_QUERY);
    const limit_k = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) || 12;

    const args: any = {
      limit_k,
      q_emb: qEmb,
      uid: finalUid,
    };
    const { data, error } = await sb.rpc('search_chunks', args);

    if (error) return res.status(500).json({ error: `[supabase] ${error.message}` });

    const results = data || [];

    let docMap: Record<string, string> = {};
    try {
      const storeName = auth.storeName || getUserFileSearchStoreName(finalUid) || getFileSearchStoreName();
      const files = await listUserFiles({ storeName, userId: finalUid });
      if (Array.isArray(files)) {
        docMap = files.reduce((acc: Record<string, string>, file: any) => {
          const meta = file?.customMetadata || file?.custom_metadata || [];
          const noteIdMeta = meta.find((m: any) => m.key === 'note_id');
          const userIdMeta = meta.find((m: any) => m.key === 'user_id');
          const noteId = noteIdMeta?.stringValue || noteIdMeta?.string_value;
          const userId = userIdMeta?.stringValue || userIdMeta?.string_value;
          if (noteId && userId === finalUid && file.name) {
            acc[noteId] = file.name;
          }
          return acc;
        }, {});
      }
    } catch (e) {
      console.warn('Failed to map File Search documents to notes:', e);
    }

    const mapped = results.map((row: any) => ({
      ...row,
      document_id: docMap[row.note_id] || row.note_id,
    }));

    return res.status(200).json(mapped);
  } catch (e: any) {
    const msg = e?.message || 'v1 failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[unknown] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

export async function handleCreateGeminiEmbedding(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { texts } = req.body;
    if (!texts || !Array.isArray(texts) || texts.some((t) => typeof t !== 'string')) {
      return res.status(400).json({ error: '`texts` field must be an array of strings.' });
    }

    const embeddings = await Promise.all(texts.map((text) => getEmbedding(text, TaskType.RETRIEVAL_DOCUMENT)));

    return res.status(200).json({ embeddings });
  } catch (e: any) {
    const msg = e?.message || 'Failed to create Gemini embedding';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[google] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

export async function handleGenerate(req: VercelRequest, res: VercelResponse) {
  try {
    const { input, context } = req.body;
    if (!input || !context) {
      return res.status(400).json({ error: 'input and context are required.' });
    }

    const result = await connectNewNote(input.query, context);
    return res.status(200).json({ data: result });
  } catch (e: any) {
    const msg = e?.message || 'Generate handler failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[google] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}
