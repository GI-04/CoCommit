import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True once the Supabase keys are in .env.local. Without them the app runs in demo mode.
export const supabaseConfigured = Boolean(url && anonKey);

// Browser client (client components). Returns null in demo mode.
export function getSupabase() {
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}
