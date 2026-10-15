"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Who = { name: string; avatar?: string };

// Shows the signed-in user and a sign-out button. Renders nothing in demo mode.
export function UserChip() {
  const [who, setWho] = useState<Who | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    // Anonymous users (chat signs people in that way) have no name or account to show.
    const read = (user: { email?: string; is_anonymous?: boolean; user_metadata?: Record<string, string> } | null | undefined) =>
      setWho(
        user && !user.is_anonymous
          ? { name: user.user_metadata?.full_name ?? user.email ?? "You", avatar: user.user_metadata?.avatar_url }
          : null,
      );
    supabase.auth.getUser().then(({ data }) => read(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => read(session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!who) return null;
  return (
    <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {who.avatar && <img src={who.avatar} alt="" className="h-7 w-7 rounded-full" />}
      <span className="min-w-0 flex-1 truncate text-sm">{who.name}</span>
      <form action="/auth/signout" method="post">
        <button className="text-xs text-muted hover:text-foreground">Sign out</button>
      </form>
    </div>
  );
}
