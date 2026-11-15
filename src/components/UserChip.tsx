"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { loadAccounts, PROFILE_CHANGED, type Accounts } from "@/lib/profile";
import { getSupabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth-email";

// The account at the bottom of the navigation: avatar and name on phone and desktop, avatar only on the tablet rail.
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

  if (!accounts) return <div className="h-12 animate-pulse rounded-full bg-white/10 md:size-12 full:size-auto full:h-14 full:w-full" aria-label="Loading account" />;
  const who = accounts.profile ?? (accounts.github && {
    name: accounts.github.name || accounts.github.login,
    avatarUrl: accounts.github.avatarUrl,
    email: `@${accounts.github.login}`,
  });
  if (!who) return (
    <Link
      href={`/login?returnTo=${encodeURIComponent(pathname)}`}
      className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black hover:opacity-90 md:size-12 md:p-0 full:size-auto full:px-4 full:py-3"
    >
      <Icon name="user" />
      <span className="md:sr-only full:not-sr-only">Log in</span>
    </Link>
  );

  return (
    <div className="w-full">
      <Link
        href="/profile"
        aria-label={`View profile for ${who.name}`}
        className={`flex items-center gap-3 rounded-full p-1.5 pr-4 hover:bg-white/10 md:justify-center md:p-0 md:pr-0 full:justify-start full:p-1.5 full:pr-4 ${pathname.startsWith("/profile") ? "glass-thumb" : ""}`}
      >
        <Avatar name={who.name} url={who.avatarUrl} className="size-10" />
        <span className="min-w-0 flex-1 md:hidden full:block">
          <span className="block truncate text-sm font-semibold text-white">{who.name}</span>
          <span className="block truncate text-xs text-white/70">{who.email || "View profile"}</span>
        </span>
      </Link>
      <button
        disabled={busy}
        className="mt-2 flex items-center gap-2 px-3 text-xs text-white/70 hover:text-white disabled:opacity-50 md:hidden full:flex"
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
      >
        <Icon name="logout" className="size-4" />
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert" className="mt-1 px-3 text-xs text-removed">{error}</p>}
    </div>
  );
}
