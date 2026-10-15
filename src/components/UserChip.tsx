"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { loadAccounts, PROFILE_CHANGED, type Accounts } from "@/lib/profile";
import { getSupabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth-email";

export function UserChip() {
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<Accounts | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let request = 0;
    const refresh = () => {
      const current = ++request;
      void loadAccounts().then((value) => {
        if (active && current === request) setAccounts(value);
      }).catch(() => {
        if (active && current === request) setAccounts({ profile: null, github: null, warnings: ["Couldn't load account."] });
      });
    };
    refresh();
    window.addEventListener(PROFILE_CHANGED, refresh);
    // Run account reads after the auth callback releases Supabase's session lock.
    const subscription = getSupabase()?.auth.onAuthStateChange(() => { setTimeout(refresh, 0); });
    return () => {
      active = false;
      window.removeEventListener(PROFILE_CHANGED, refresh);
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  if (!accounts) return <div className="mt-auto h-12 animate-pulse rounded-md bg-line/50" aria-label="Loading account" />;
  const who = accounts.profile ?? (accounts.github && {
    name: accounts.github.name || accounts.github.login,
    avatarUrl: accounts.github.avatarUrl,
  });
  if (!who) return (
    <Link href={`/login?returnTo=${encodeURIComponent(pathname)}`} className="mt-auto rounded-md bg-fg px-3 py-2 text-center text-sm font-medium text-bg hover:opacity-90">
      Log in
    </Link>
  );

  return (
    <div className="w-full border-t border-line pt-3 md:mt-auto">
      <Link href="/profile" className="flex items-center gap-2 rounded-md p-1 hover:bg-line/60" aria-label={`View profile for ${who.name}`}>
        <Avatar name={who.name} url={who.avatarUrl} className="h-8 w-8" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{who.name}</span>
          <span className="block text-xs text-muted">View profile</span>
        </span>
      </Link>
      <button
        disabled={busy}
        className="mt-2 px-1 text-xs text-muted hover:text-fg disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const result = await signOut();
            if (result.error) throw new Error(result.error);
            location.assign("/login");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't sign out. Try again.");
            setBusy(false);
          }
        }}
      >{busy ? "Signing out…" : "Sign out"}</button>
      {error && <p role="alert" className="mt-1 text-xs text-removed">{error}</p>}
    </div>
  );
}
