// Removed VercelRequest/VercelResponse import for Next.js compatibility
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '../auth';
import { summarizeDay } from '../ai';

export async function handleCalendar(req: any, res: any) {
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
      return res.status(401).json({ error: '유효하지 않은 인증 토큰입니다.' });
    }
    const msg = e?.message || '달력 핸들러 실패';
    return res.status(500).json({ error: msg });
  }
}

export async function handleGetNotesForDate(req: any, res: any) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;
  const date = req.query.date as string;
  if (!date) {
    return res.status(400).json({ error: "날짜 파라미터가 누락되었습니다." });
  }
  const { data, error } = await supabase.rpc('get_notes_for_date', {
    note_date: date,
    uid: userId,
  });
  if (error) {
    return res.status(500).json({ error: '해당 날짜의 노트를 가져오지 못했습니다.', detail: error.message });
  }
  res.status(200).json(data ?? []);
}

export async function handleGetFullNotesForDate(req: any, res: any) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;
  const date = req.query.date as string;
  if (!date) {
    return res.status(400).json({ error: "날짜 파라미터가 누락되었습니다." });
  }
  const { data, error } = await supabase.rpc('get_full_notes_for_date', {
    note_date: date,
    uid: userId,
  });
  if (error) {
    return res.status(500).json({ error: '해당 날짜의 전체 노트를 가져오지 못했습니다.', detail: error.message });
  }
  res.status(200).json(data ?? []);
}

export async function handleSummarizeDay(req: any, res: any) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, userId } = auth;
  
  // Try to get notes from body first (from frontend fetchAndSummarizeDay)
  let notes = req.body?.notes;
  
  if (!notes) {
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '날짜 파라미터 또는 노트 데이터가 누락되었습니다.' });
    }
    const { data, error } = await supabase.rpc('get_full_notes_for_date', {
      note_date: date,
      uid: userId,
    });
    if (error) {
      return res.status(500).json({ error: '요약을 위한 노트를 가져오지 못했습니다.', detail: error.message });
    }
    notes = data;
  }

  const summary = await summarizeDay(notes ?? []);
  res.status(200).json(summary);
}
