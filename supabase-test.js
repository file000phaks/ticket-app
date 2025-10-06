// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = "https://jsnnuhmqovxnwtvzmebb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzbm51aG1xb3Z4bnd0dnptZWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTExODgsImV4cCI6MjA3MzA2NzE4OH0.V3OM8TuX7OVqr2bh-VxheKI7x4F_a0CLhTLh6KsSAjs";

// --- Safety checks ---
if (!supabaseUrl) {
  throw new Error(
    'Missing Supabase URL. Make sure VITE_SUPABASE_URL is set in your .env.local'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing Supabase anon key. Make sure VITE_SUPABASE_ANON_KEY is set in your .env.local'
  );
}

// Log first few chars to confirm the key loaded
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase anon key starts with:', supabaseAnonKey.slice(0, 10));

// Create client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Optional quick test function ---
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
      console.error('Supabase test query error:', error.message);
    } else {
      console.log('Supabase test query successful, data:', data);
    }
  } catch (err) {
    console.error('Supabase network or fetch error:', err);
  }
}

testConnection();