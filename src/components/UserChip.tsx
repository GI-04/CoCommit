"use client";

import { useEffect, useState } from "react";
import { getSession, signInHref, signOutOfGitHub } from "@/lib/github-client";
import { getSupabase } from "@/lib/supabase";

type Who = { name: string; avatar?: string; via: "github" | "google" };

// Bottom of the sidebar: "Sign in with GitHub", or the signed-in user with a sign-out button.
// GitHub is the demo's login; a Google (Supabase) user only shows when REQUIRE_GOOGLE_LOGIN is on.
// Renders nothing in GitHub fake mode (no OAuth keys) unless someone is signed in with Google.
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
    if (!github || github.fake) return null;
    return (
      <a
        href={signInHref(typeof location === "undefined" ? "/" : location.pathname)}
        className="mt-auto flex items-center justify-center gap-2 rounded-md bg-fg px-3 py-2 text-sm font-medium text-bg hover:opacity-90"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Sign in with GitHub
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
