// Browser-only account settings. Auth metadata is the profile source of truth;
// public.profiles is a best-effort mirror for consumers that join the table.
import type { User } from "@supabase/supabase-js";
import { friendly, MIN_PASSWORD_LENGTH } from "./auth-email";
import { getSession } from "./github-client";
import type { User as GitHubUser } from "./github-types";
import { getSupabase } from "./supabase";

export const PROFILE_CHANGED = "cocommit:profile-changed";
export type AccountProfile = {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  pendingEmail: string;
  createdAt: string;
  emailAccount: boolean;
};
export type Accounts = { profile: AccountProfile | null; github: GitHubUser | null; warnings: string[] };

export function profileFromUser(user: User | null): AccountProfile | null {
  if (!user || user.is_anonymous) return null;
  const text = (value: unknown) => typeof value === "string" ? value : "";
  return {
    id: user.id,
    name: text(user.user_metadata?.full_name) || text(user.user_metadata?.name) || user.email?.split("@")[0] || "Your account",
    avatarUrl: safeAvatar(text(user.user_metadata?.avatar_url)),
    email: user.email ?? "",
    pendingEmail: user.new_email ?? "",
    createdAt: user.created_at,
    emailAccount: user.identities?.some((identity) => identity.provider === "email") ?? user.app_metadata?.provider === "email",
  };
}

/** Only HTTPS image URLs; an empty value removes the custom avatar. */
export function safeAvatar(value: string): string {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export async function loadAccounts(): Promise<Accounts> {
  const supabase = getSupabase();
  const [github, account] = await Promise.allSettled([
    getSession(),
    supabase ? supabase.auth.getUser() : Promise.resolve({ data: { user: null }, error: null }),
  ]);
  const warnings: string[] = [];
  if (github.status === "rejected") warnings.push("Couldn't load your GitHub account. Try again.");
  if (account.status === "rejected" || (account.status === "fulfilled" && account.value.error && account.value.error.name !== "AuthSessionMissingError")) {
    warnings.push("Couldn't load your CoCommit account. Try again.");
  }
  return {
    profile: account.status === "fulfilled" && !account.value.error ? profileFromUser(account.value.data.user) : null,
    github: github.status === "fulfilled" && !github.value.fake ? github.value.user : null,
    warnings,
  };
}

function changed() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROFILE_CHANGED));
}

async function signedInAccount() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Account settings aren't available yet.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw new Error("Log in again to change your account.");
  return { supabase, user: data.user };
}

export async function saveProfile(name: string, avatarUrl: string): Promise<{ profile: AccountProfile; warning: string | null }> {
  name = name.trim();
  avatarUrl = avatarUrl.trim();
  if (!name || name.length > 80) throw new Error("Use a display name between 1 and 80 characters.");
  if (avatarUrl && !safeAvatar(avatarUrl)) throw new Error("Use an HTTPS image URL, or leave the avatar empty.");
  avatarUrl = safeAvatar(avatarUrl);
  const { supabase, user } = await signedInAccount();
  const { data, error } = await supabase.auth.updateUser({ data: { full_name: name, avatar_url: avatarUrl } });
  if (error) throw new Error(friendly(error));
  const profile = profileFromUser(data.user);
  if (!profile) throw new Error("Your session expired. Log in again.");
  // No caller-supplied ID, email or credentials ever enter the public profile row.
  let warning: string | null = null;
  try {
    const mirror = await supabase.from("profiles").update({ name, avatar_url: avatarUrl || null }).eq("id", user.id).select("id").maybeSingle();
    if (mirror.error || !mirror.data) warning = "Your profile is saved. Some team views may take longer to show the change.";
  } catch {
    warning = "Your profile is saved. Some team views may take longer to show the change.";
  }
  changed();
  return { profile, warning };
}

async function verifyPassword(password: string) {
  const { supabase, user } = await signedInAccount();
  if (!profileFromUser(user)?.emailAccount || !user.email) throw new Error("Manage this account's login details with its sign-in provider.");
  if (!password) throw new Error("Enter your current password.");
  const { data, error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (error) throw new Error(friendly(error));
  if (data.user?.id !== user.id) throw new Error("Your account changed. Reload this page and try again.");
  return supabase;
}

export async function changeEmail(email: string, currentPassword: string): Promise<AccountProfile> {
  email = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  const supabase = await verifyPassword(currentPassword);
  const { data, error } = await supabase.auth.updateUser({ email }, {
    emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile`,
  });
  if (error) throw new Error(friendly(error));
  const profile = profileFromUser(data.user);
  if (!profile) throw new Error("Your session expired. Log in again.");
  changed();
  return profile;
}

export async function changePassword(currentPassword: string, password: string): Promise<void> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`);
  const supabase = await verifyPassword(currentPassword);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(friendly(error));
}
