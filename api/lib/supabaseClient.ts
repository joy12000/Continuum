import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('[config] SUPABASE_URL and SUPABASE_SERVICE_KEY are required.')
}

// Note: this is the SERVICE client, don't expose it to the browser
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseKey,
  { auth: { persistSession: false } }
)
