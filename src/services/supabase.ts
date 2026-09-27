import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  projectRef: (import.meta as any).env?.VITE_SUPABASE_PROJECT_REF || '',
  dbUrl: '',
};

