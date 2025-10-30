import { createClient } from '@supabase/supabase-js';
export const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);
// expose for debugging ONLY (we'll remove later)
if (typeof window !== "undefined") {
  // @ts-ignore
  window.sb = sb;
}
