import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Guard against missing env so the app never crashes at import time; the
// direct-Supabase fallback layer simply no-ops and the app uses the Express API.
export const supabase: SupabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : (null as unknown as SupabaseClient);
