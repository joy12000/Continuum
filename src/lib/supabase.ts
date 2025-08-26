// PATCH: Vite/Browser-safe Supabase client (works on Vercel too)
import { createClient } from "@supabase/supabase-js";

const fromProcess = (typeof process !== "undefined" && process.env) ? process.env : undefined;

const supabaseUrl =
  (fromProcess && (fromProcess.NEXT_PUBLIC_SUPABASE_URL as string | undefined)) ||
  ((import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined);

const supabaseAnonKey =
  (fromProcess && (fromProcess.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined)) ||
  ((import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string | undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  // Avoid hard crash in production; still visible in console
  console.error("[supabase] Missing env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_*)");
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
