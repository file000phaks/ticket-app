import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wfvdepgdajlvlnlueltk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdmRlcGdkYWpsdmxubHVlbHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2MzUzNzUsImV4cCI6MjA1MTIxMTM3NX0.hNVvvz8R3jTpLhLxGnB8Q-tqZgqhfCX5rZ0j7cxhUjU';

// Create the most minimal client possible
const minimalSupabase = createClient(supabaseUrl, supabaseAnonKey);
