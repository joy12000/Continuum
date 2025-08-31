import { createClient } from '@supabase/supabase-js';

// --- DEBUGGING LOGS ---
console.log('[supabaseClient.ts] Checking environment variables:');
console.log(`- SUPABASE_URL is set: ${!!process.env.SUPABASE_URL}`)
console.log(`- SUPABASE_SERVICE_KEY is set: ${!!process.env.SUPABASE_SERVICE_KEY}`)
// --- END DEBUGGING ---

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase;

if (!supabaseUrl || !supabaseKey) {
  console.error('[supabaseClient.ts] CRITICAL: SUPABASE_URL and SUPABASE_SERVICE_KEY are required. Creating a dummy client to allow execution to continue for debugging.');
  // Create a dummy client to avoid crashing the entire application
  supabase = {
    rpc: async () => {
      return { error: { message: 'Dummy client: Supabase credentials not provided.' }, data: null };
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

export { supabase };