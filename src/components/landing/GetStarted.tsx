"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/github-client";
import { getStartedHref } from "@/lib/login-identity";
import { getSupabase } from "@/lib/supabase";

const visitor = getStartedHref({ account: false, github: false, demo: false });

// The page has three Get started buttons: they share one check while it runs.
let checking: Promise<string> | null = null;
function startHref(): Promise<string> {
  checking ??= (async () => {
    const supabase = getSupabase();
    // An anonymous session (left over from older chat) doesn't count as signed in.
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const account = Boolean(session && !session.user.is_anonymous);
    const github = await getSession().catch(() => null);
    return getStartedHref({ account, github: Boolean(github?.user && !github.fake), demo: !supabase && Boolean(github?.fake) });
  })().finally(() => {
    checking = null;
  });
  return checking;
}

// "Get started" on the landing page: the login page for visitors, the app for anyone already signed in.
// It starts as the login link and switches to /home once this browser turns out to be signed in.
export function GetStarted({ className }: { className: string }) {
  const [href, setHref] = useState(visitor);

  useEffect(() => {
    let live = true;
    startHref()
      .then((next) => live && setHref(next))
      .catch(() => {
        // Offline: keep the login link.
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <Link href={href} className={className}>
      Get started
    </Link>
  );
}
