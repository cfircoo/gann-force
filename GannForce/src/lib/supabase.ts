import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://nvvgqvkbooqrdusugmgg.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52dmdxdmtib29xcmR1c3VnbWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDkzNjUsImV4cCI6MjA4NjMyNTM2NX0.SafREKWntFMmJv720S3RpSo4z03cvXpn2y1DgefNZzY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
