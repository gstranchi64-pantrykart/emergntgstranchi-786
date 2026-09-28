import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bgxnmmecjcgrwtemmjtz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneG5tbWVjamNncnd0ZW1tanR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzgwNTgsImV4cCI6MjEwNTcxNDA1OH0.1BEmrzrTZuM7jyyVw8-qp8JjKfuk1cB4oDtpNih43o8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
