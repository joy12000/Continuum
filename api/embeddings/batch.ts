
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

// Use public-facing keys here, not the service key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Get the user's JWT from the Authorization header
    const token = req.headers.authorization?.split(' ')?.[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token not provided.' });
    }

    // 2. Create a new Supabase client for this specific request, authenticated as the user
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    // 3. Validate request body
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'Invalid request: "ids" must be a non-empty array.' });
    }

    // 4. Fetch data. RLS is automatically enforced by Supabase.
    const { data, error } = await supabase
      .from('note_embeddings')
      .select('id, embedding')
      .in('id', ids);

    if (error) {
      throw error;
    }

    return res.status(200).json(data || []);

  } catch (e: any) {
    console.error('[api/embeddings/batch] Error:', e.message);
    // Avoid leaking detailed error messages to the client
    if (e.message.includes('JWT')) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
