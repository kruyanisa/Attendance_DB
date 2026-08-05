const SUPABASE_URL = "https://zxbxfmcoadtxngxugpqz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YnhmbWNvYWR0eG5neHVncHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MjIyMzMsImV4cCI6MjEwMTM5ODIzM30.BPkFjPLOrePb_OkwFnccyBO5zlfyCC4OzADfYv6nPOc";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);