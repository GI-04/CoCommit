// What the person using the app may do (browser code). Email/password and Google users get chat and files;
// git actions (commit, pull requests, editing the context) need a GitHub sign-in.
// See CLAUDE/PLAN/2026-10-15-email-password-login.md. The server enforces the same rules: git actions fail
// with 401 without the GitHub cookie, and Supabase table rules need a signed-in user. This is for the UI,
// so it can say what's missing before people try.
import { getSession } from "./github-client";
import { getSupabase } from "./supabase";

export type LoginMethod = "github" | "email" | "google";

export type Permissions = {
  /** How the person logged in, or null when signed out (anonymous chat users count as signed out). */
  via: LoginMethod | null;
  chat: boolean;
  files: boolean;
  git: boolean;
};

export const NEEDS_GITHUB = "Sign in with GitHub to commit, open pull requests or edit the context.";
export const NEEDS_LOGIN = "Log in to chat and upload files.";

export async function getPermissions(): Promise<Permissions> {
  const [github, account] = await Promise.all([githubState(), supabaseAccount()]);
  const via: LoginMethod | null = github.signedIn ? "github" : account;
  const loggedIn = via !== null;
  return { via, chat: loggedIn, files: loggedIn, git: github.signedIn || github.fake };
}

/** Shortcut for git screens: true when commits and pull requests will work. */
export async function canUseGit(): Promise<boolean> {
  const github = await githubState();
  return github.signedIn || github.fake;
}

// In fake mode (no GitHub keys) the git screens run on sample data, so git is allowed without a sign-in.
async function githubState(): Promise<{ signedIn: boolean; fake: boolean }> {
  try {
    const s = await getSession();
    return { signedIn: !s.fake && s.user !== null, fake: s.fake };
  } catch {
    return { signedIn: false, fake: false };
  }
}

async function supabaseAccount(): Promise<LoginMethod | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) return null;
  // GitHub sign-ins are Supabase users too (PLAN/2026-10-15-login-identity.md).
  const provider = user.app_metadata?.provider;
  return provider === "email" ? "email" : provider === "github" ? "github" : "google";
}
