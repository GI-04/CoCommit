"use client";

// Data for the Home tabs: one hook per source, each with the same states so the cards can say what is wrong
// (log in, no team workspace yet, an error) instead of staying empty.
import { useEffect, useRef, useState } from "react";
import { loadMessages, type ChatMessage } from "@/lib/chat";
import { NoWorkspaceError } from "@/lib/chat-pins";
import { FILES, type Activity } from "@/lib/context";
import { getCurrentRepo } from "@/lib/current-repo";
import { friendlyError } from "@/lib/errors";
import { GitHubRequestError, listCommitDates, listCommits, listSharedFiles, readFile, type SharedFile } from "@/lib/github-client";
import { windowStart, type CommitDate } from "@/lib/heatmap";
import { nextStepLine } from "@/lib/home-summary";
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

/**
 * Loads once per repo (and `rev`). With `enabled` false nothing is read and what was already loaded stays; turning it
 * back on reads again only if there is nothing loaded yet for that repo.
 */
function useLoad<T>(repo: string | null, load: (repo: string) => Promise<T>, rev = 0, enabled = true): Load<T> {
  const [state, setState] = useState<Load<T>>({ status: "loading" });
  // The repo and rev that `state` holds data for, so switching `enabled` off and on doesn't read the same thing twice.
  const loaded = useRef<string | null>(null);
  useEffect(() => {
    if (!repo || !enabled) return;
    const key = `${repo}\n${rev}`;
    if (loaded.current === key) return;
    let live = true;
    loaded.current = null;
    setState({ status: "loading" });
    load(repo)
      .then((data) => {
        if (!live) return;
        loaded.current = key;
        setState({ status: "ready", data });
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof GitHubRequestError && e.status === 401) setState({ status: "login" });
        else if (e instanceof NoWorkspaceError) setState({ status: "no-workspace" });
        else setState({ status: "error", message: friendlyError(e) });
      });
    return () => {
      live = false;
    };
    // `load` is always a module-level function below, so it never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, rev, enabled]);
  return state;
}

const commitDates = (repo: string) => listCommitDates(repo, windowStart(WEEKS, new Date()).toISOString());
const latestActivity = async (repo: string) => (await recentActivity(repo, 12)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);

export const useCommits = (repo: string | null): Load<CommitDate[]> => useLoad(repo, commitDates);
export const useBoard = (repo: string | null): Load<Board> => useLoad(repo, loadBoard);
export const useActivity = (repo: string | null): Load<Activity[]> => useLoad(repo, latestActivity);
/** The `COCOMMIT/` team files; `ready` with `null` means the repo has no team context yet. */
export const useWorkspace = (repo: string | null, rev = 0): Load<Workspace | null> => useLoad(repo, loadWorkspace, rev);

// Home's shortcut cards each show a few lines of real data (Repository, Messages, Agent Context, Drive). Each hook loads on
// its own and can be paused with `enabled` (the cards are only tiles while they are being arranged); a card whose data can't
// load (signed out, no team files, an error) simply shows nothing extra, so the callers only look at `ready`.
const latestCommit = async (repo: string) => (await listCommits(repo, 1))[0] ?? null;
const recentChat = (repo: string) => loadMessages(repo, 2);
// Only HANDOFF.md is read here, not the whole workspace: the card needs one line of it.
const nextStep = async (repo: string) => nextStepLine((await readFile(repo, null, FILES.handoff)) ?? "");
// Shared files carry no date, so these are the files in the order GitHub lists them (by path), not the newest.
const driveFiles = async (repo: string) => (await listSharedFiles(repo)).files;

/** The newest commit on the default branch; `null` when the repo has none. */
export const useLatestCommit = (repo: string | null, enabled = true): Load<Activity | null> => useLoad(repo, latestCommit, 0, enabled);
/** The last two chat messages, oldest first. Needs a real login, so signed out this ends in `error`. */
export const useRecentChat = (repo: string | null, enabled = true): Load<ChatMessage[]> => useLoad(repo, recentChat, 0, enabled);
/** The first line of HANDOFF.md's "next step" section; `null` when there is no such section. */
export const useNextStep = (repo: string | null, enabled = true): Load<string | null> => useLoad(repo, nextStep, 0, enabled);
/** The files in Drive (COCOMMIT/files), in the order GitHub lists them. */
export const useDriveFiles = (repo: string | null, enabled = true): Load<SharedFile[]> => useLoad(repo, driveFiles, 0, enabled);

/** One line for a card that can't show its data, or null while it is loading or ready. */
export function problem(state: Load<unknown>): string | null {
  if (state.status === "login") return "Log in with GitHub to see this.";
  if (state.status === "no-workspace") return "This repo has no team context yet.";
  if (state.status === "error") return state.message;
  return null;
}
