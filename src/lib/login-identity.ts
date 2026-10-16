// Pure helpers for "Sign in with GitHub" through Supabase (PLAN/2026-10-15-login-identity.md).
// No Next.js or Supabase imports, so tests can load this file on its own.
//
// Flow: /api/github/login → Supabase → GitHub → Supabase → /auth/callback?next=…&provider=github.
// The callback swaps the code for a Supabase session (the user *is* the GitHub account) and keeps
// GitHub's token, sealed, in the cc_github cookie that src/lib/github.ts already reads.

/** GitHub scopes the app needs: private repos (read/write) and the user's profile. */
export const GITHUB_SCOPES = "repo read:user";

/** Marks /auth/callback visits that come from our own GitHub sign-in. */
export const GITHUB_PROVIDER_PARAM = "github";

/** Only same-site paths, so `returnTo` / `next` can't send people to another site. */
export function safeReturnTo(path: string | null | undefined, fallback = "/repo"): string {
  return path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : fallback;
}

/** Where Supabase sends the browser after GitHub: our callback, with the page to return to. */
export function githubCallbackUrl(origin: string, returnTo: string | null | undefined): string {
  const params = new URLSearchParams({ next: safeReturnTo(returnTo), provider: GITHUB_PROVIDER_PARAM });
  return `${origin}/auth/callback?${params}`;
}

type UserLike = {
  app_metadata?: { provider?: string; providers?: string[] } | null;
  identities?: { provider?: string }[] | null;
} | null;

type SessionLike = { provider_token?: string | null; user?: UserLike } | null;

/** True for a Supabase user who signed in with GitHub (used to tell "needs to reconnect" from "signed out"). */
export function hasGitHubIdentity(user: UserLike | undefined): boolean {
  return Boolean(
    user?.identities?.some((i) => i.provider === "github") || user?.app_metadata?.providers?.includes("github") || user?.app_metadata?.provider === "github",
  );
}

/**
 * GitHub's token from a fresh Supabase session, or null when it isn't one.
 * /auth/callback also handles Google and email links, and Supabase returns a provider_token for
 * Google too, so a token is only kept when our GitHub sign-in started this visit **and** the user
 * really has a GitHub identity.
 */
export function githubTokenFromSession(providerParam: string | null | undefined, session: SessionLike): string | null {
  if (providerParam !== GITHUB_PROVIDER_PARAM) return null;
  const token = session?.provider_token;
  return token && hasGitHubIdentity(session?.user) ? token : null;
}

/**
 * Where "Get started" on the landing page goes (PLAN/2026-10-16-chat-privacy-get-started.md): the app for anyone
 * signed in (a real Supabase account or a GitHub session) and in demo mode (no keys, every screen is open), else
 * the login page, which comes back to /home.
 */
export function getStartedHref(state: { account: boolean; github: boolean; demo: boolean }): string {
  return state.account || state.github || state.demo ? "/home" : "/login?returnTo=/home";
}
