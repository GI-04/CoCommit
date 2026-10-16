"use client";

// The repos the signed-in person can see, for the side lists of Messages (chats, teams). Signed out or on any
// error the list is empty, and `fake` says it is the demo list (don't remember a repo picked from it).
import { useEffect, useState } from "react";
import { getSession, listRepos, type Repo } from "@/lib/github-client";

export function useRepos(): { repos: Repo[]; fake: boolean } {
  const [state, setState] = useState<{ repos: Repo[]; fake: boolean }>({ repos: [], fake: false });
  useEffect(() => {
    let live = true;
    getSession()
      .then(async (s) => {
        if (!s.user) return;
        const repos = await listRepos();
        if (live) setState({ repos, fake: s.fake });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return state;
}
