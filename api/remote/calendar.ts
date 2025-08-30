
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')?.[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token not provided.' });
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { start_date, end_date } = req.query;
    if (!start_date || !end_date || typeof start_date !== 'string' || typeof end_date !== 'string') {
      return res.status(400).json({ error: 'start_date and end_date query parameters are required.' });
    }

    // Supabase RPC call to get note counts by date for the authenticated user
    const { data, error } = await supabase.rpc('get_notes_activity', {
      start_date_str: start_date,
      end_date_str: end_date,
    });

    if (error) {
      throw error;
    }

    // The RPC function is expected to return { date: string, count: number }[]
    return res.status(200).json(data || []);

  } catch (e: any) {
    console.error('[api/calendar] Error:', e.message);
    if (e.message.includes('JWT')) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
