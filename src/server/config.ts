import type { VercelRequest } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function pickSupabase(req: VercelRequest): SupabaseClient | null {
  const hasAuth = !!req.headers.authorization;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (hasAuth && anon) {
    const token = req.headers.authorization!.split(' ')?.[1];
    return createClient(process.env.SUPABASE_URL!, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
  }
  return null;
}

export const MAX_NOTES = parseInt(process.env.CONTINUUM_MAX_NOTES || '400', 10);

export const envNum = (name: string, def: number) => {
  const v = process.env[name];
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export const envBool01 = (name: string, def: boolean) => {
  const v = process.env[name];
  if (v == null) return def;
  return v === '1' || v.toLowerCase() === 'true';
};
