import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://zaxnikpkftyfzpmmlevz.supabase.co';
const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG5pa3BrZnR5ZnpwbW1sZXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTc1NDQsImV4cCI6MjEwMjc3MzU0NH0.AVAwVt2Z8DJMFtTOr8NDbi0u14_hBIdrb3L2TZAJOTw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
