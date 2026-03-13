const SUPABASE_URL  = "https://tgborqvdkujajsggfbcy.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYm9ycXZka3VqYWpzZ2dmYmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTczNTcsImV4cCI6MjA4ODU5MzM1N30.zOxjjFeeYV_7tNOydh_kxVh85cBX-QYYzMLP4WYjKs8";
const EDGE_BASE     = `${SUPABASE_URL}/functions/v1`;

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

