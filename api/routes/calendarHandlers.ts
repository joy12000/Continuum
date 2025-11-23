import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '../shared-lib/auth.js';
import { summarizeDay } from '../shared-lib/ai.js';

export async function handleCalendar(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const token = req.headers.authorization?.split(' ')?.[1];
    if (!token) {
      return res.status(401).json({ error: '[config] Authentication token not provided.' });
    }

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
      return res.status(401).json({ error: '[supabase] Invalid authentication token.' });
    }
    const msg = e?.message || 'Calendar handler failed';
    const tag = /^\^\[(supabase|google|openai|config)\]/.test(msg) ? '' : '[supabase] ';
    return res.status(500).json({ error: `${tag}${msg}` });
  }
}

export async function handleGetNotesForDate(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;
  const date = req.query.date as string;
  if (!date) {
    return res.status(400).json({ error: "Missing date parameter" });
  }
  const { data, error } = await supabase.rpc('get_notes_for_date', {
    note_date: date,
    uid: userId,
  });
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch notes for date', detail: error.message });
  }
  res.status(200).json({ notes: data ?? [] });
}

export async function handleGetFullNotesForDate(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;
  const date = req.query.date as string;
  if (!date) {
    return res.status(400).json({ error: "Missing date parameter" });
  }
  const { data, error } = await supabase.rpc('get_full_notes_for_date', {
    note_date: date,
    uid: userId,
  });
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch full notes for date', detail: error.message });
  }
  res.status(200).json({ notes: data ?? [] });
}

export async function handleSummarizeDay(req: VercelRequest, res: VercelResponse) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Missing date parameter' });
  }
  const { data, error } = await supabase.rpc('get_full_notes_for_date', {
    note_date: date,
    uid: userId,
  });
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch notes for day', detail: error.message });
  }
  const summary = await summarizeDay(data ?? []);
  res.status(200).json(summary);
}
