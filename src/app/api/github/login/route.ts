import { NextResponse, type NextRequest } from "next/server";
import { fakeMode, signInUrl } from "@/lib/github";
import { GITHUB_SCOPES, githubCallbackUrl } from "@/lib/login-identity";
import { getSupabaseServer } from "@/lib/supabase-server";

// GET /api/github/login?returnTo=/repo → "Sign in with GitHub".
// When Supabase has its GitHub provider on, sign-in goes through Supabase, so the Supabase user *is* the
// GitHub account (PLAN/2026-10-15-login-identity.md); /auth/callback keeps GitHub's token.
// Otherwise (provider off, or no Supabase keys) it falls back to our own GitHub OAuth (/api/github/callback),
// and in fake mode it goes straight back to returnTo.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const returnTo = req.nextUrl.searchParams.get("returnTo");
  if (fakeMode || !(await supabaseGitHubEnabled())) return NextResponse.redirect(await signInUrl(origin, returnTo));

  const supabase = await getSupabaseServer();
  const result = await supabase?.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: githubCallbackUrl(origin, returnTo, req.nextUrl.searchParams.get("desktop") === "1"), scopes: GITHUB_SCOPES, skipBrowserRedirect: true },
  });
  if (!result?.data.url || result.error) return NextResponse.redirect(new URL("/login?error=signin_failed", origin));
  return NextResponse.redirect(result.data.url);
}

// Supabase's public auth settings say which providers are on (same check the login page does for Google).
async function supabaseGitHubEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { external?: Record<string, boolean> };
    return Boolean(data.external?.github);
  } catch {
    return false;
  }
}
