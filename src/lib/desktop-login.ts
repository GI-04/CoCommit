// Desktop GitHub sign-in, app window side (PLAN/2026-10-19-security-fixes.md, item 1).
// Before the sign-in opens in the system browser, the app window makes a random verifier, keeps it here and sends only
// its hash (the challenge). The ticket that comes back through cocommit://auth carries that challenge, and
// /auth/desktop/confirm hands the verifier to the server, so only this window can redeem it (desktop-handoff.ts).
// Browser only; no imports, so tests load it on its own.

const KEY = "cc_desktop_signin";
/** A sign-in left unfinished for longer than this has to start again. */
export const SIGNIN_MAX_AGE_MS = 10 * 60 * 1000;

export type PendingSignIn = { verifier: string; challenge: string };

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** A fresh verifier (32 random bytes) and its challenge, base64url(sha256(verifier)). */
export async function newSignIn(): Promise<PendingSignIn> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  return { verifier, challenge };
}

/** Keeps the verifier of the sign-in this window just started (a newer one replaces it). */
export function rememberSignIn(verifier: string, now = Date.now()): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ verifier, at: now }));
  } catch {
    // Storage blocked: the sign-in can't be finished in this window, and confirm says so.
  }
}

/** The kept verifier, removed as it is read so it works once; null if there is none or it is too old. */
export function takeSignIn(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    const saved = raw ? (JSON.parse(raw) as { verifier?: unknown; at?: unknown }) : null;
    if (typeof saved?.verifier !== "string" || typeof saved.at !== "number") return null;
    return now - saved.at <= SIGNIN_MAX_AGE_MS ? saved.verifier : null;
  } catch {
    return null;
  }
}
