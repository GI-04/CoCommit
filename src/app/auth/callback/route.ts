import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

// Google sends the user back here with ?code=...; swap it for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  // Only allow same-site paths so this can't be used as an open redirect.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";

  const supabase = await getSupabaseServer();
  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/login?error=signin_failed`);
}
