import { NextResponse } from "next/server";
import { openHandoff } from "@/lib/desktop-handoff";
import { saveGitHubToken } from "@/lib/github";
import { safeReturnTo } from "@/lib/login-identity";
import { getSupabaseServer } from "@/lib/supabase-server";

// The desktop app opens this from the cocommit://auth deep link (src-tauri/src/lib.rs): it swaps the ticket made by
// /auth/callback for session cookies in the app's own window (PLAN/2026-10-16-desktop-github-login.md).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const handoff = openHandoff(searchParams.get("ticket"), process.env.GITHUB_CLIENT_SECRET ?? "");
  const supabase = await getSupabaseServer();
  if (handoff && supabase) {
    const { error } = await supabase.auth.setSession({ access_token: handoff.accessToken, refresh_token: handoff.refreshToken });
    if (!error) {
      if (handoff.githubToken) await saveGitHubToken(handoff.githubToken);
      return NextResponse.redirect(`${origin}${safeReturnTo(handoff.next, "/home")}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=signin_failed`);
}
