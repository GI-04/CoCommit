import { NextResponse } from "next/server";
import { saveGitHubToken } from "@/lib/github";
import { sealHandoff } from "@/lib/desktop-handoff";
import { githubTokenFromSession, safeReturnTo } from "@/lib/login-identity";
import { getSupabaseServer } from "@/lib/supabase-server";

// Supabase sends the browser back here with ?code=... after GitHub or Google sign-in, and from email
// confirm/reset links; swap it for a session cookie. After our GitHub sign-in (?provider=github) also keep
// GitHub's token, sealed in the cc_github cookie the git buttons use (PLAN/2026-10-15-login-identity.md).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-site paths, so this can't be used as an open redirect.
  const next = safeReturnTo(searchParams.get("next"), "/home");

  const supabase = await getSupabaseServer();
  if (supabase && code && !searchParams.get("error")) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const token = githubTokenFromSession(searchParams.get("provider"), data.session);
      // Desktop app: the sign-in ran in the system browser, so pass the session on to the app.
      if (searchParams.get("desktop") === "1" && data.session) {
        const ticket = sealHandoff(
          { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, githubToken: token, next },
          process.env.GITHUB_CLIENT_SECRET ?? "",
        );
        if (ticket) return NextResponse.redirect(`${origin}/auth/desktop?ticket=${ticket}`);
      }
      if (token) await saveGitHubToken(token);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=signin_failed`);
}
