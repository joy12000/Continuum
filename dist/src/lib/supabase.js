// PATCH: Vite/Browser-safe Supabase client (works on Vercel too)
import { createClient } from "@supabase/supabase-js";
const fromProcess = (typeof process !== "undefined" && process.env) ? process.env : undefined;
const supabaseUrl = (fromProcess && fromProcess.NEXT_PUBLIC_SUPABASE_URL) ||
    import.meta?.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (fromProcess && fromProcess.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    import.meta?.env?.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    // Avoid hard crash in production; still visible in console
    console.error("[supabase] Missing env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_*)");
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
