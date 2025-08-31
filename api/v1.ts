// api/v1.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseService } from './lib/supabaseClient'; // Renamed to avoid conflict
import { getEmbeddings } from './lib/embedding';
import { getEmbedding as getGeminiEmbedding, getGenerativeModel } from './lib/generativeai';
import { trimContext as trim } from './generate-utils/trim';

export const config = { runtime: 'nodejs' };

// Search Handler
async function handleSearch(req: VercelRequest, res: VercelResponse) {
  try {
    const { q, model } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter \'q\' is required.' });
    }

    const token = req.headers.authorization?.split(' ')?.[1];
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    let query_embedding: number[];
    if (model === 'gemini-api') {
      query_embedding = await getGeminiEmbedding(q);
    } else {
      const embeddings = await getEmbeddings([q], 'query');
      if (embeddings.length === 0) {
        return res.status(400).json({ error: 'Failed to generate embedding for query.' });
      }
      query_embedding = embeddings[0];
    }

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

// Create Embedding Handler
async function handleCreateEmbedding(req: VercelRequest, res: VercelResponse) {
  try {
    const { texts } = req.body;
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'texts field is required and must be an array.' });
    }
    const embeddings = await getEmbeddings(texts, 'document');
    return res.status(200).json({ embeddings });
  } catch (e: any) {
    if (e.message.includes('No embedding key set')) {
      return res.status(400).json({ error: 'Embedding API key is not configured on the server.' });
    }
    console.error('Create embedding handler failed:', e);
    return res.status(500).json({ error: e?.message || 'API handler failed' });
  }
}

// Create Gemini Embedding Handler
async function handleCreateGeminiEmbedding(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text field is required.' });
    }
    const embedding = await getGeminiEmbedding(text);
    return res.status(200).json({ embedding });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to create Gemini embedding' });
  }
}

// Generate Handler
async function handleGenerate(req: VercelRequest, res: VercelResponse) { /* ... */ }

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
      case 'create-embedding':
        return await handleCreateEmbedding(req, res);
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