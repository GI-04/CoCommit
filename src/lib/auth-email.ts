// Email and password login through Supabase Auth (browser code). Email users share the Supabase session,
// profile and chat rules that Google users have; git actions still need a GitHub sign-in.
// See CLAUDE/PLAN/2026-10-15-email-password-login.md. Every helper returns { error } instead of throwing,
// so the login screens can show the message as is.
import type { AuthError } from "@supabase/supabase-js";
import { signOutOfGitHub } from "./github-client";
import { getSupabase } from "./supabase";

export type AuthResult = { error: string | null };

export const MIN_PASSWORD_LENGTH = 8;

const NOT_SET_UP = "Email login isn't set up yet.";

// Only same-site paths, so a link can't send people to another site.
const safePath = (p: string | undefined) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");

const callbackUrl = (next: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(safePath(next))}`;

function checkEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Enter a valid email address.";
}

function checkPassword(password: string): string | null {
  return password.length >= MIN_PASSWORD_LENGTH ? null : `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`;
}

/** Creates an account and signs in. `returnTo` is where the confirmation email link lands, if confirmation is on. */
export async function signUpWithEmail(email: string, password: string, name: string, returnTo = "/"): Promise<AuthResult & { needsConfirmation: boolean }> {
  const supabase = getSupabase();
  const fail = (error: string) => ({ error, needsConfirmation: false });
  if (!supabase) return fail(NOT_SET_UP);
  email = email.trim();
  name = name.trim();
  if (!name) return fail("Enter your name.");
  const invalid = checkEmail(email) ?? checkPassword(password);
  if (invalid) return fail(invalid);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // full_name is what the profiles trigger, chat and the sidebar read.
    options: { data: { full_name: name }, emailRedirectTo: callbackUrl(returnTo) },
  });
  if (error) return fail(friendly(error));
  // With "Confirm email" on, Supabase hides an already-used address by returning a user with no identities.
  if (data.user && data.user.identities?.length === 0) return fail("An account with this email already exists. Log in instead.");
  return { error: null, needsConfirmation: !data.session };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { error: NOT_SET_UP };
  email = email.trim();
  if (!email || !password) return { error: "Enter your email and password." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? friendly(error) : null };
}

/** Emails a link that signs the user in and opens /login/reset to choose a new password. */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { error: NOT_SET_UP };
  email = email.trim();
  const invalid = checkEmail(email);
  if (invalid) return { error: invalid };
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/login/reset") });
  return { error: error ? friendly(error) : null };
}

/** Sets a new password for the signed-in user (used by /login/reset after the email link). */
export async function updatePassword(password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { error: NOT_SET_UP };
  const invalid = checkPassword(password);
  if (invalid) return { error: invalid };
  const { data } = await supabase.auth.getUser();
  if (!data.user || data.user.is_anonymous) return { error: "This reset link has expired. Ask for a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? friendly(error) : null };
}

/** Signs out of everything: the Supabase session (email, Google, chat) and the GitHub cookie. */
export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabase();
  const [supa, github] = await Promise.allSettled([supabase?.auth.signOut(), signOutOfGitHub()]);
  if (supa.status === "rejected" || github.status === "rejected") return { error: "Couldn't sign out. Check the connection and try again." };
  const error = supa.value?.error;
  return { error: error ? friendly(error) : null };
}

/** Turns a Supabase Auth error into a message people can act on. */
export function friendly(e: Pick<AuthError, "message"> & { code?: string; status?: number }): string {
  switch (e.code) {
    case "invalid_credentials":
      return "Wrong email or password.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Log in instead.";
    case "weak_password":
      return `That password is too easy to guess. Use at least ${MIN_PASSWORD_LENGTH} characters, mixing letters and numbers.`;
    case "same_password":
      return "That's your current password. Choose a different one.";
    case "email_not_confirmed":
      return "Confirm your email first: open the link we sent you.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many tries. Wait a minute and try again.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "Email sign-up is turned off right now. Use GitHub or Google instead.";
  }
  if (e.status === 0 || /fetch|network/i.test(e.message)) return "Can't reach the login server. Check your internet connection.";
  return e.message;
}
