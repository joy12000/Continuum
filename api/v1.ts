// api/v1.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { TaskType } from '@google/generative-ai';
import { supabase as supabaseService } from './lib/supabaseClient.js'; // Renamed to avoid conflict
import { getEmbedding, getGenerativeModel } from './lib/generativeai.js';
import { trimContext as trim } from './generate-utils/trim.js';

export const config = { runtime: 'nodejs' };

// Search Handler
async function handleSearch(req: VercelRequest, res: VercelResponse) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: "Query parameter 'q' is required." });
    }

    console.log('Search request received. Authorization header present:', !!req.headers.authorization);
    const token = req.headers.authorization?.split(' ')?.[1];
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const query_embedding = await getEmbedding(q, TaskType.RETRIEVAL_QUERY);

    const { data, error } = await supabase.rpc('match_notes', {
      query_embedding: query_embedding,
      match_threshold: 0.7,
      match_count: 10,
    });

    if (error) throw error;
    return res.status(200).json(data || []);

  } catch (e: any) {
    if (e.message.includes('JWT')) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    console.error('Search handler failed:', e);
    return res.status(500).json({ error: e?.message || 'API handler failed' });
  }
}

// Create Gemini Embedding Handler
async function handleCreateGeminiEmbedding(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { texts } = req.body;
    if (!texts || !Array.isArray(texts) || texts.some(t => typeof t !== 'string')) {
      return res.status(400).json({ error: '`texts` field must be an array of strings.' });
    }

    const embeddings = await Promise.all(
      texts.map(text => getEmbedding(text, TaskType.RETRIEVAL_DOCUMENT))
    );

    return res.status(200).json({ embeddings });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to create Gemini embedding' });
  }
}

// Generate Handler
async function handleGenerate(req: VercelRequest, res: VercelResponse) {
  try {
    const { input, context } = req.body;
    if (!input || !context) {
      return res.status(400).json({ error: 'input and context are required.' });
    }

    const model = getGenerativeModel();
    const prompt = `Context: ${JSON.stringify(context)}\n\nQuestion: ${input.query}\n\nAnswer:`
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });

  } catch (e: any) {
    console.error('Generate handler failed:', e);
    return res.status(500).json({ error: e?.message || 'API handler failed' });
  }
}

// Calendar Handler
async function handleCalendar(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const token = req.headers.authorization?.split(' ')?.[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token not provided.' });
    }

    // This needs to create a new client with the user's token
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { start_date, end_date } = req.query;
    if (!start_date || !end_date || typeof start_date !== 'string' || typeof end_date !== 'string') {
      return res.status(400).json({ error: 'start_date and end_date query parameters are required.' });
    }

    const { data, error } = await supabase.rpc('get_notes_activity', {
      start_date_str: start_date,
      end_date_str: end_date,
    });

    if (error) throw error;
    return res.status(200).json(data || []);

  } catch (e: any) {
    if (e.message.includes('JWT')) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    throw e; // Re-throw to be caught by the main handler
  }
}


// Main API Gateway Handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

    switch (action) {
      case 'search':
        return await handleSearch(req, res);
      case 'create-embedding': // Legacy endpoint name for compatibility
      case 'create-gemini-embedding':
        return await handleCreateGeminiEmbedding(req, res);
      case 'generate':
        return await handleGenerate(req, res);
      case 'calendar':
        return await handleCalendar(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'API handler failed' });
  }
}
