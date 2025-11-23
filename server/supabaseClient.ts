import { createClient, SupabaseClient } from "@supabase/supabase-js";

const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_ANON_KEY"] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`${key} is required.`);
  }
}

export function getSupabaseClient(token?: string): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  const headers: Record<string, string> = {};

  if (token) headers["Authorization"] = `Bearer ${token}`;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
