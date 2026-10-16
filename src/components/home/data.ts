"use client";

// Data for the Home tabs: one hook per source, each with the same states so the cards can say what is wrong
// (log in, no team workspace yet, an error) instead of staying empty.
import { useEffect, useState } from "react";
import { NoWorkspaceError } from "@/lib/chat-pins";
import type { Activity } from "@/lib/context";
import { getCurrentRepo } from "@/lib/current-repo";
import { GitHubRequestError, listCommitDates } from "@/lib/github-client";
import { windowStart, type CommitDate } from "@/lib/heatmap";
import { loadBoard, type Board } from "@/lib/tasks";
import { loadWorkspace, recentActivity, type Workspace } from "@/lib/workspace";

export type Load<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "login" }
  | { status: "no-workspace" }
  | { status: "error"; message: string };

export const WEEKS = 13;

/** The repo chat and the other screens use, known after the first render (it lives in this browser's storage). */
export function useRepo(): string | null {
  const [repo, setRepo] = useState<string | null>(null);
  useEffect(() => setRepo(getCurrentRepo()), []);
  return repo;
}

function useLoad<T>(repo: string | null, load: (repo: string) => Promise<T>, rev = 0): Load<T> {
  const [state, setState] = useState<Load<T>>({ status: "loading" });
  useEffect(() => {
    if (!repo) return;
    let live = true;
    setState({ status: "loading" });
    load(repo)
      .then((data) => live && setState({ status: "ready", data }))
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof GitHubRequestError && e.status === 401) setState({ status: "login" });
        else if (e instanceof NoWorkspaceError) setState({ status: "no-workspace" });
        else setState({ status: "error", message: e instanceof Error ? e.message : "Something went wrong." });
      });
    return () => {
      live = false;
    };
    // `load` is always a module-level function below, so it never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, rev]);
  return state;
}

const commitDates = (repo: string) => listCommitDates(repo, windowStart(WEEKS, new Date()).toISOString());
const latestActivity = async (repo: string) => (await recentActivity(repo, 12)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);

export const useCommits = (repo: string | null): Load<CommitDate[]> => useLoad(repo, commitDates);
export const useBoard = (repo: string | null): Load<Board> => useLoad(repo, loadBoard);
export const useActivity = (repo: string | null): Load<Activity[]> => useLoad(repo, latestActivity);
/** The `COCOMMIT/` team files; `ready` with `null` means the repo has no team context yet. */
export const useWorkspace = (repo: string | null, rev = 0): Load<Workspace | null> => useLoad(repo, loadWorkspace, rev);

/** One line for a card that can't show its data, or null while it is loading or ready. */
export function problem(state: Load<unknown>): string | null {
  if (state.status === "login") return "Log in with GitHub to see this.";
  if (state.status === "no-workspace") return "This repo has no team context yet. Set it up on the Agent Context screen.";
  if (state.status === "error") return state.message;
  return null;
}
