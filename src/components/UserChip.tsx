"use client";

import { useEffect, useState } from "react";
import { getSession, signOutOfGitHub } from "@/lib/github-client";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

type Who = { name: string; avatar?: string; via: "github" | "google" };

// Bottom of the sidebar: a "Log in" button (to /login, where people pick GitHub or Google),
// or the signed-in user with a sign-out button. Renders nothing when no login method can exist.
export function UserChip() {
  const [github, setGithub] = useState<{ who: Who | null; fake: boolean } | null>(null);
  const [google, setGoogle] = useState<Who | null>(null);

  useEffect(() => {
    getSession()
      .then((s) =>
        setGithub({
          fake: s.fake,
          who: s.user && !s.fake ? { name: s.user.name || s.user.login, avatar: s.user.avatarUrl, via: "github" } : null,
        }),
      )
      .catch(() => setGithub({ who: null, fake: true }));

    const supabase = getSupabase();
    if (!supabase) return;
    // Anonymous users (chat signs people in that way) have no name or account to show.
    const read = (user: { email?: string; is_anonymous?: boolean; user_metadata?: Record<string, string> } | null | undefined) =>
      setGoogle(
        user && !user.is_anonymous
          ? { name: user.user_metadata?.full_name ?? user.email ?? "You", avatar: user.user_metadata?.avatar_url, via: "google" }
          : null,
      );
    supabase.auth.getUser().then(({ data }) => read(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => read(session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const who = github?.who ?? google;

  if (!who) {
    // Show "Log in" once any login method could exist; /login lists the ones that are set up.
    if (!github || (github.fake && !supabaseConfigured)) return null;
    const here = typeof location === "undefined" ? "/" : location.pathname;
    return (
      <a
        href={`/login?returnTo=${encodeURIComponent(here)}`}
        className="mt-auto flex items-center justify-center rounded-md bg-fg px-3 py-2 text-sm font-medium text-bg hover:opacity-90"
      >
        Log in
      </a>
    );
  }

  const signOut = async () => {
    if (who.via === "github") {
      await signOutOfGitHub();
      location.reload();
    }
  };

  return (
    <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {who.avatar && <img src={who.avatar} alt="" className="h-7 w-7 rounded-full" />}
      <span className="min-w-0 flex-1 truncate text-sm">{who.name}</span>
      {who.via === "github" ? (
        <button onClick={signOut} className="text-xs text-muted hover:text-fg">
          Sign out
        </button>
      ) : (
        <form action="/auth/signout" method="post">
          <button className="text-xs text-muted hover:text-fg">Sign out</button>
        </form>
      )}
    </div>
  );
}
