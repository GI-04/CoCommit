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

/**
 * Only same-site paths, so `returnTo` / `next` can't send people to another site. The one check for the whole app
 * (login page, email links, both GitHub sign-ins). Browsers read "\" as "/" and drop tabs and newlines inside a URL,
 * so "/\evil.com" and "/<tab>/evil.com" would leave the site: any backslash or control character is refused.
 */
export function safeReturnTo(path: string | null | undefined, fallback = "/repo"): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(path)) return fallback;
  try {
    return new URL(path, "https://same.invalid").origin === "https://same.invalid" ? path : fallback;
  } catch {
    return fallback;
  }
}

/** Where Supabase sends the browser after GitHub: our callback, with the page to return to. */
export function githubCallbackUrl(origin: string, returnTo: string | null | undefined, desktop = false, challenge?: string | null): string {
  const params = new URLSearchParams({ next: safeReturnTo(returnTo), provider: GITHUB_PROVIDER_PARAM });
  // The sign-in runs in the system browser; /auth/callback then hands the session to the desktop app, in a ticket bound
  // to the app window's challenge (src/lib/desktop-handoff.ts). Without a valid challenge no ticket is made.
  if (desktop) params.set("desktop", "1");
  if (desktop && typeof challenge === "string" && /^[A-Za-z0-9_-]{43}$/.test(challenge)) params.set("challenge", challenge);
  return `${origin}/auth/callback?${params}`;
}

type UserLike = {
  app_metadata?: { provider?: string; providers?: string[] } | null;
  identities?: { provider?: string; id?: string; identity_data?: { provider_id?: unknown; sub?: unknown } | null }[] | null;
} | null;

type SessionLike = { provider_token?: string | null; user?: UserLike } | null;

/** True for a Supabase user who signed in with GitHub (used to tell "needs to reconnect" from "signed out"). */
export function hasGitHubIdentity(user: UserLike | undefined): boolean {
  return Boolean(
    user?.identities?.some((i) => i.provider === "github") || user?.app_metadata?.providers?.includes("github") || user?.app_metadata?.provider === "github",
  );
}

/** The GitHub user id (as text) of a Supabase user's linked GitHub identity, or null without one. */
export function githubIdOf(user: UserLike | undefined): string | null {
  const identity = user?.identities?.find((i) => i.provider === "github");
  const id = identity?.identity_data?.provider_id ?? identity?.identity_data?.sub ?? identity?.id;
  return typeof id === "string" || typeof id === "number" ? String(id) || null : null;
}

/**
 * Whether the GitHub account behind the cc_github cookie (`tokenOwnerId`, from GitHub's /user) is the signed-in Supabase
 * user's own. Repo access is checked with that cookie, so a cookie someone else left on this browser must not count.
 */
export function sameGitHubAccount(user: UserLike | undefined, tokenOwnerId: string | number | null | undefined): boolean {
  const mine = githubIdOf(user);
  return mine !== null && tokenOwnerId !== null && tokenOwnerId !== undefined && mine === String(tokenOwnerId);
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
