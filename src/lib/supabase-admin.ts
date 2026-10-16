import { createClient } from "@supabase/supabase-js";

// Server only: a Supabase client with the service role key, which skips every table rule. Used for one job:
// recording verified repo members (src/app/api/chat/join/route.ts, PLAN/2026-10-16-repo-members-only.md).
// The key has no NEXT_PUBLIC_ prefix, so Next.js never sends it to the browser. Null while it isn't set.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
