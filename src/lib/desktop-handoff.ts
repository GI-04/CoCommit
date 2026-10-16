// Hands a GitHub sign-in done in the system browser over to the desktop app (PLAN/2026-10-16-desktop-github-login.md).
// The browser seals the session into a short-lived ticket; the app opens it at /auth/desktop/finish.
// Server only. Pure apart from node:crypto, so tests can load this file on its own.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const TICKET_TTL_MS = 5 * 60 * 1000;

export type Handoff = { accessToken: string; refreshToken: string; githubToken: string | null; next: string };

function key(secret: string): Buffer {
  return createHash("sha256").update(`cocommit-desktop-handoff:${secret}`).digest();
}

/** Encrypts the session into a URL-safe ticket that stops working after TICKET_TTL_MS. Null if there is no secret. */
export function sealHandoff(data: Handoff, secret: string, now = Date.now()): string | null {
  if (!secret) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify({ ...data, exp: now + TICKET_TTL_MS }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** The session inside a ticket, or null when it is forged, damaged or expired. */
export function openHandoff(ticket: string | null | undefined, secret: string, now = Date.now()): Handoff | null {
  if (!ticket || !secret) return null;
  try {
    const raw = Buffer.from(ticket, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const parsed = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
    if (typeof parsed.exp !== "number" || parsed.exp < now) return null;
    if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string" || typeof parsed.next !== "string") return null;
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      githubToken: typeof parsed.githubToken === "string" ? parsed.githubToken : null,
      next: parsed.next,
    };
  } catch {
    return null;
  }
}
