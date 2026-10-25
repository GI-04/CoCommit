import { NextResponse } from "next/server";
import { openHandoff, verifierMatches } from "@/lib/desktop-handoff";
import { saveGitHubToken, signOut as forgetGitHub } from "@/lib/github";
import { hasGitHubIdentity, safeReturnTo } from "@/lib/login-identity";
import { getSupabaseServer } from "@/lib/supabase-server";

// The desktop app opens this from the cocommit://auth deep link (src-tauri/src/lib.rs, PLAN/2026-10-16-desktop-github-login.md).
// GET sets nothing: it sends the window on to /auth/desktop/confirm, which POSTs the ticket back here together with the
// verifier this app window kept when it started the sign-in (PLAN/2026-10-19-security-fixes.md, item 1). A ticket
// opened anywhere else has no verifier, so it can't sign that browser or app into someone's account.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const to = new URL("/auth/desktop/confirm", origin);
  const ticket = searchParams.get("ticket");
  if (ticket) to.searchParams.set("ticket", ticket);
  return NextResponse.redirect(to);
}

const EXPIRED = "This sign-in has expired or didn't start in this app window. Log in again from the app.";

// POST {"ticket", "verifier"} → {"next"} with the session cookies set, or {"error"}.
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  if (request.headers.get("origin") !== origin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Send JSON." }, { status: 415 });
  const body = (await request.json().catch(() => null)) as { ticket?: unknown; verifier?: unknown } | null;

  const handoff = openHandoff(typeof body?.ticket === "string" ? body.ticket : null, process.env.GITHUB_CLIENT_SECRET ?? "");
  if (!handoff || !verifierMatches(body?.verifier, handoff.challenge)) return NextResponse.json({ error: EXPIRED }, { status: 400 });

  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ error: "Sign-in isn't set up here." }, { status: 503 });
  const { data, error } = await supabase.auth.setSession({ access_token: handoff.accessToken, refresh_token: handoff.refreshToken });
  if (error) return NextResponse.json({ error: EXPIRED }, { status: 400 });

  // Same rule as /auth/callback: no GitHub token in the ticket drops a stray GitHub cookie unless the account has its own GitHub.
  if (handoff.githubToken) await saveGitHubToken(handoff.githubToken);
  else if (!hasGitHubIdentity(data.user)) await forgetGitHub();
  return NextResponse.json({ next: safeReturnTo(handoff.next, "/home") });
}
