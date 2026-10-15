import { NextResponse } from "next/server";
import { signOut } from "@/lib/github";
import { getSupabaseServer } from "@/lib/supabase-server";

// POST /api/github/logout signs out of everything on this device: the GitHub token and the Supabase
// session (GitHub, email or Google login), so nobody stays half signed in.
export async function POST() {
  await signOut();
  const supabase = await getSupabaseServer();
  const result = await supabase?.auth.signOut();
  if (result?.error) return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
