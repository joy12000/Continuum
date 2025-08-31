// api/v1.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseService } from '../lib/supabaseClient'; // Renamed to avoid conflict
import { getEmbeddings } from '../lib/embedding';
import { generativeModel } from '../lib/generativeai';
import { trim, RagContext, RagInput } from '../generate-utils/rag';

export const config = { runtime: 'nodejs' };

// Search Handler
async function handleSearch(req: VercelRequest, res: VercelResponse) { /* ... */ }

// Create Embedding Handler
async function handleCreateEmbedding(req: VercelRequest, res: VercelResponse) { /* ... */ }

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