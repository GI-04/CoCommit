"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import {
  chooseRepoFolder,
  commit,
  discard,
  getDiff,
  getStatus,
  pull,
  push,
  remoteRepo,
  stage,
  unstage,
  type FileChange,
  type GitStatus,
} from "@/lib/local-git";

const LAST = "cocommitLocalRepo";
const label: Record<string, string> = { M: "modified", A: "added", D: "deleted", R: "renamed", C: "copied", T: "type changed", U: "conflict" };
const color: Record<string, string> = { A: "text-added", D: "text-removed" };

type Pick = { file: string; mode: "staged" | "unstaged" | "untracked" };
type Note = { kind: "ok" | "error"; text: string; href?: string };

// Local mode of the Repo page (desktop app only): a cloned repo on this computer, through the user's own git.
export function LocalRepo() {
  const [repo, setRepo] = useState<string | null>(null);
  const [github, setGithub] = useState<string | null>(null);
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [diff, setDiff] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);

  const run = useCallback(async (what: string, fn: () => Promise<unknown>, ok?: string, href?: string) => {
    setBusy(what);
    try {
      await fn();
      if (ok) setNote({ kind: "ok", text: ok, href });
      return true;
    } catch (e) {
      setNote({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const refresh = useCallback(async (r: string) => setStatus(await getStatus(r)), []);

  const open = useCallback(
    async (r: string) => {
      setRepo(r);
      setPick(null);
      setDiff("");
      try {
        localStorage.setItem(LAST, r);
      } catch {}
      await run("open", async () => {
        const [, gh] = await Promise.all([refresh(r), remoteRepo(r)]);
        setGithub(gh);
      });
    },
    [refresh, run],
  );

  // Reopen the last folder, and refresh when the window gets focus (files may have changed in an editor).
  useEffect(() => {
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST);
    } catch {}
    if (last) open(last);
  }, [open]);
  useEffect(() => {
    if (!repo) return;
    const onFocus = () => refresh(repo).catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [repo, refresh]);

  // Forget the picked file once it has left its list (staged, committed, discarded…).
  useEffect(() => {
    if (!pick || !status) return;
    const list =
      pick.mode === "staged" ? status.staged.map((f) => f.path) : pick.mode === "untracked" ? status.untracked : [...status.unstaged.map((f) => f.path), ...status.conflicted];
    if (!list.includes(pick.file)) setPick(null);
  }, [status, pick]);

  useEffect(() => {
    if (!repo || !pick) return setDiff("");
    getDiff(repo, pick.file, pick.mode)
      .then((d) => setDiff(d || "(no text changes to show)"))
      .catch((e) => setDiff(String(e.message ?? e)));
  }, [repo, pick, status]);

  const choose = () =>
    run("open", async () => {
      const r = await chooseRepoFolder();
      if (r) await open(r);
    });

  const act = (what: string, fn: () => Promise<unknown>, ok?: string, href?: string) =>
    repo && run(what, async () => {
      await fn();
      await refresh(repo);
    }, ok, href);

  if (!repo)
    return (
      <Card>
        <p className="mb-4 text-sm">Open a repository you cloned on this computer to see staged, changed and untracked files.</p>
        <Button onClick={choose} disabled={busy !== null}>
          {busy ? "Opening…" : "Choose folder"}
        </Button>
        {note?.kind === "error" && <p className="mt-3 text-sm text-removed">{note.text}</p>}
      </Card>
    );

  const s = status;
  const prHref = github && s?.branch ? `https://github.com/${github}/compare/${encodeURIComponent(s.branch)}?expand=1` : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="max-w-full truncate rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs" title={repo}>
          {repo}
        </span>
        {s && (
          <span className="rounded-md border border-line bg-surface px-2 py-1">
            {s.branch ?? "detached"}
            {s.upstream ? ` → ${s.upstream}` : " (not on GitHub yet)"}
            {s.ahead > 0 && <span className="ml-2 text-added">↑{s.ahead}</span>}
            {s.behind > 0 && <span className="ml-1 text-removed">↓{s.behind}</span>}
          </span>
        )}
        {github && <span className="text-xs text-muted">GitHub: {github}</span>}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => repo && run("refresh", () => refresh(repo))} disabled={busy !== null}>
            Refresh
          </Button>
          <Button variant="ghost" onClick={() => act("pull", () => pull(repo), "Pulled the latest from GitHub.")} disabled={busy !== null}>
            {busy === "pull" ? "Pulling…" : "Pull"}
          </Button>
          <Button
            onClick={() => act("push", () => push(repo), `Pushed ${s?.branch ?? "your branch"} to GitHub.`, prHref)}
            disabled={busy !== null || !s || (s.ahead === 0 && !!s.upstream)}
          >
            {busy === "push" ? "Pushing…" : s && s.ahead > 0 ? `Push ↑${s.ahead}` : "Push"}
          </Button>
          <Button variant="ghost" onClick={choose} disabled={busy !== null}>
            Change folder
          </Button>
        </div>
      </div>

      {note && (
        <p className={`rounded-md border px-3 py-2 text-sm ${note.kind === "ok" ? "border-added/40 bg-added/10" : "border-removed/40 bg-removed/10"}`}>
          {note.text}{" "}
          {note.href && (
            <a href={note.href} target="_blank" rel="noreferrer" className="underline">
              Open a pull request
            </a>
          )}
          <button onClick={() => setNote(null)} className="ml-2 text-xs text-muted" aria-label="Dismiss">
            ✕
          </button>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          {s && s.conflicted.length > 0 && (
            <Card tone="clay" title={`Conflicts (${s.conflicted.length})`}>
              <p className="mb-2 text-xs text-muted">Fix these in your editor, then stage them.</p>
              <FileList files={s.conflicted.map((p) => ({ path: p, code: "U" as const }))} onPick={(f) => setPick({ file: f, mode: "unstaged" })} pick={pick} />
            </Card>
          )}
          <Card title={`Staged (${s?.staged.length ?? 0})`}>
            <FileList
              files={s?.staged ?? []}
              pick={pick?.mode === "staged" ? pick : null}
              onPick={(f) => setPick({ file: f, mode: "staged" })}
              action="Unstage"
              onAction={(f) => act("unstage", () => unstage(repo, [f]))}
              allLabel="Unstage all"
              onAll={() => act("unstage", () => unstage(repo, s!.staged.map((x) => x.path)))}
              empty="Nothing staged yet."
            />
          </Card>
          <Card title={`Changes (${s?.unstaged.length ?? 0})`}>
            <FileList
              files={s?.unstaged ?? []}
              pick={pick?.mode === "unstaged" ? pick : null}
              onPick={(f) => setPick({ file: f, mode: "unstaged" })}
              action="Stage"
              onAction={(f) => act("stage", () => stage(repo, [f]))}
              allLabel="Stage all"
              onAll={() => act("stage", () => stage(repo, s!.unstaged.map((x) => x.path)))}
              onDiscard={(f) => window.confirm(`Throw away your changes to ${f}? This can't be undone.`) && act("discard", () => discard(repo, [f]))}
              empty="No changes to tracked files."
            />
          </Card>
          <Card title={`Untracked (${s?.untracked.length ?? 0})`}>
            <FileList
              files={(s?.untracked ?? []).map((p) => ({ path: p, code: "A" as const }))}
              pick={pick?.mode === "untracked" ? pick : null}
              onPick={(f) => setPick({ file: f, mode: "untracked" })}
              action="Stage"
              onAction={(f) => act("stage", () => stage(repo, [f]))}
              allLabel="Stage all"
              onAll={() => act("stage", () => stage(repo, s!.untracked))}
              empty="No new files."
            />
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card tone="dark" title={pick ? `${pick.file} (${pick.mode})` : "Diff"}>
            {pick ? (
              <pre className="max-h-[26rem] overflow-auto rounded-md bg-black/30 p-2 font-mono text-[13px] leading-6">
                {diff.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith("+") && !line.startsWith("+++")
                        ? "bg-added/10 text-added"
                        : line.startsWith("-") && !line.startsWith("---")
                          ? "bg-removed/10 text-removed"
                          : line.startsWith("@@")
                            ? "text-muted"
                            : ""
                    }
                  >
                    {line || " "}
                  </div>
                ))}
              </pre>
            ) : (
              <p className="text-sm text-muted">Click a file to see what changed.</p>
            )}
          </Card>
          <Card tone="pink" title="Commit">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="What did you change?"
              className="w-full rounded-md border border-line bg-bg p-2 text-sm"
            />
            <Button
              className="mt-2 w-full"
              disabled={busy !== null || !message.trim() || !s?.staged.length}
              onClick={async () => {
                const ok = await act("commit", () => commit(repo, message.trim()), `Committed “${message.trim()}”. Push when you're ready.`);
                if (ok) setMessage("");
              }}
            >
              {busy === "commit" ? "Committing…" : `Commit ${s?.staged.length ?? 0} staged file(s)`}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FileList(props: {
  files: FileChange[];
  pick: Pick | null;
  onPick: (path: string) => void;
  action?: string;
  onAction?: (path: string) => void;
  allLabel?: string;
  onAll?: () => void;
  onDiscard?: (path: string) => void;
  empty?: string;
}) {
  const { files, pick, onPick, action, onAction, allLabel, onAll, onDiscard, empty } = props;
  if (!files.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <>
      {onAll && files.length > 1 && (
        <button onClick={onAll} className="mb-2 text-xs text-accent-soft hover:underline">
          {allLabel}
        </button>
      )}
      <ul className="max-h-60 space-y-0.5 overflow-y-auto">
        {files.map((f) => (
          <li key={f.path} className={`group flex items-center gap-2 rounded px-1 ${pick?.file === f.path ? "bg-fg/10" : ""}`}>
            <span className={`w-4 text-xs ${color[f.code] ?? "text-accent-soft"}`} title={label[f.code]}>
              {f.code}
            </span>
            <button onClick={() => onPick(f.path)} className="min-w-0 flex-1 truncate py-1 text-left text-sm" title={f.origPath ? `${f.origPath} → ${f.path}` : f.path}>
              {f.path}
            </button>
            {onDiscard && (
              <button onClick={() => onDiscard(f.path)} className="text-xs text-muted opacity-0 hover:text-removed group-hover:opacity-100">
                Discard
              </button>
            )}
            {onAction && action && (
              <button onClick={() => onAction(f.path)} className="text-xs text-accent-soft opacity-60 hover:opacity-100">
                {action}
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
