"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { ListPanel, repoItem } from "@/components/ListPanel";
import { MessagesShell } from "@/components/MessagesShell";
import { Button, Card, Pill } from "@/components/ui";
import { useRepos } from "@/components/useRepos";
import { NoWorkspaceError } from "@/lib/chat-pins";
import { DEFAULT_REPO, getCurrentRepo, setCurrentRepo } from "@/lib/current-repo";
import { getSession, GitHubRequestError, signInHref, type User } from "@/lib/github-client";
import {
  createTask,
  finishTask,
  loadBoard,
  releaseTask,
  takeTask,
  TaskMovedError,
  whoAmI,
  type Board,
  type NewTaskForm,
  type Saved,
  type Task,
  type TaskStatus,
} from "@/lib/tasks";

type State = "loading" | "login" | "no-workspace" | "ready" | "error";
// The small form open under one card: who takes it, how it was checked, or the handoff note.
type Action = { path: string; kind: "take" | "done" | "release"; who: string; text: string };
type Note = { ok: boolean; text: string; href?: string };

// The folder is the status (Pending / Taken / Done); "Taken" shows as "Doing", as in the Figma board.
const COLUMNS: { status: TaskStatus; title: string; empty: string; tone: "pink" | "mustard" | "green" }[] = [
  { status: "pending", title: "Pending", empty: "Nothing waiting. Add a task.", tone: "pink" },
  { status: "taken", title: "Doing", empty: "Nobody is on a task right now.", tone: "mustard" },
  { status: "done", title: "Done", empty: "Nothing finished yet.", tone: "green" },
];
const input = "w-full rounded-md border border-line bg-bg px-2 py-1 text-sm";
const blankTask: NewTaskForm = { title: "", to: "anyone", what: "", acceptance: "" };
// Card preview: the start of "What" without Markdown's ** and backticks.
const preview = (what: string) => what.replace(/\*\*|`/g, "");
const fileLink = (b: Board, path: string) =>
  `https://github.com/${b.repo}/blob/${encodeURIComponent(b.branch)}/${path.split("/").map(encodeURIComponent).join("/")}`;

export default function TasksPage() {
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [fake, setFake] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [form, setForm] = useState<NewTaskForm | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (r: string) => {
    setState("loading");
    setNote(null);
    try {
      const s = await getSession();
      setFake(s.fake);
      setUser(s.user);
      if (!s.user || s.needsReconnect) return setState("login");
      setBoard(await loadBoard(r));
      setState("ready");
    } catch (e) {
      if (e instanceof NoWorkspaceError) setState("no-workspace");
      else if (e instanceof GitHubRequestError && e.status === 401) setState("login");
      else {
        setError(e instanceof Error ? e.message : "Couldn't load the board.");
        setState("error");
      }
    }
  }, []);

  // The repo picked on /repo, read here (not during render) so the server and browser render the same first frame.
  useEffect(() => {
    const picked = getCurrentRepo();
    setRepo(picked);
    void load(picked);
  }, [load]);

  const me = board ? whoAmI(board.members, user) : "";

  // Runs one save; on success swaps the task into the board (by its old path) and links the commit.
  async function save(run: () => Promise<Saved>, oldPath: string | null, done: string) {
    if (!board) return;
    setBusy(true);
    setNote(null);
    try {
      const { task, commit } = await run();
      setBoard({ ...board, tasks: [task, ...board.tasks.filter((t) => t.path !== oldPath)].sort((a, b) => b.file.localeCompare(a.file)) });
      setAction(null);
      setForm(null);
      setOpen(null);
      setNote({ ok: true, text: done, href: commit.url });
    } catch (e) {
      if (e instanceof GitHubRequestError && e.status === 401) setState("login");
      else setNote({ ok: false, text: e instanceof TaskMovedError || e instanceof Error ? e.message : "Couldn't save. Try again." });
    } finally {
      setBusy(false);
    }
  }

  function submitAction(task: Task) {
    if (!board || !action) return;
    if (action.kind === "take") void save(() => takeTask(board, task, action.who || me, action.text), task.path, `Taken by ${action.who || me}.`);
    if (action.kind === "done") void save(() => finishTask(board, task, action.text, me), task.path, "Moved to Done and added to LOG.md.");
    if (action.kind === "release") void save(() => releaseTask(board, task, action.text, me), task.path, "Released back to Pending.");
  }

  // The teams on the left are the person's repos; picking one switches the board (and the repo chat and calls use).
  const { repos: myRepos, fake: demoRepos } = useRepos();
  const teams = [repo, ...myRepos.map((r) => r.fullName).filter((n) => n !== repo)].slice(0, 12).map(repoItem);
  const openTeam = (id: string) => {
    setRepo(id);
    if (!demoRepos) setCurrentRepo(id);
    setForm(null);
    setAction(null);
    void load(id);
  };

  const toolbar = (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[28px] font-semibold leading-tight text-white">{repo.split("/")[1] ?? repo} team</h2>
        <div className="flex flex-wrap items-center gap-2">
          {fake && <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">demo data</span>}
          {state === "ready" && (
            <>
              <Button variant="glass" onClick={() => void load(repo)} disabled={busy}>
                Refresh
              </Button>
              <Button variant="glass" onClick={() => setForm(form ? null : { ...blankTask })} disabled={busy}>
                New task
              </Button>
            </>
          )}
          <a href={`https://github.com/${repo}/settings/access`} target="_blank" rel="noreferrer" className="rounded-xl border border-black bg-[var(--blue)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Invite
          </a>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">The task board in {repo}/COCOMMIT/BOARD/. Every move is a commit that your team&apos;s AI agents read too.</p>
    </div>
  );

  const shell = (content: React.ReactNode) => (
    <MessagesShell active="team">
      <div className="grid gap-4 max-lg:grid-cols-[minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <ListPanel title="Teams" items={teams} value={repo} onSelect={openTeam} />
        <div className="min-w-0">
          {toolbar}
          {content}
        </div>
      </div>
    </MessagesShell>
  );

  if (state !== "ready" || !board)
    return shell(
        <Card className="max-w-xl">
          {state === "loading" && <p className="text-sm text-muted">Loading the board…</p>}
          {state === "login" && (
            <>
              <p className="mb-4 text-sm">Log in with GitHub to see and move tasks.</p>
              <a href={signInHref("/tasks")} className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
                Continue with GitHub
              </a>
            </>
          )}
          {state === "no-workspace" && (
            <p className="text-sm">
              {repo} has no team context yet, so it has no task board. Set it up on the{" "}
              <Link href="/context" className="underline">
                Context
              </Link>{" "}
              screen first, or pick another repo on the{" "}
              <Link href="/repo" className="underline">
                Repo
              </Link>{" "}
              screen.
            </p>
          )}
          {state === "error" && (
            <>
              <p className="mb-3 text-sm text-removed">{error}</p>
              <Button variant="ghost" onClick={() => void load(repo)}>
                Try again
              </Button>
            </>
          )}
        </Card>,
    );

  return shell(
    <>
      {note && (
        <p className={`mb-4 text-sm ${note.ok ? "text-muted" : "text-removed"}`} role="status">
          {note.text}{" "}
          {note.href && (
            <a href={note.href} target="_blank" rel="noreferrer" className="underline">
              View commit
            </a>
          )}
        </p>
      )}

      {form && (
        <Card title="New task" className="mb-4 max-w-2xl">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save(() => createTask(board, form, me), null, "Task added to Pending.");
            }}
          >
            <label className="block text-sm">
              Title
              <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
            </label>
            <label className="block text-sm">
              For
              <select className={input} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
                <option value="anyone">anyone</option>
                {board.members.map((m) => (
                  <option key={m.title} value={m.title}>
                    {m.title}
                    {m.role ? ` (${m.role})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              What needs doing
              <textarea className={input} rows={3} value={form.what} onChange={(e) => setForm({ ...form, what: e.target.value })} />
            </label>
            <label className="block text-sm">
              Done when (one per line)
              <textarea className={input} rows={2} value={form.acceptance} onChange={(e) => setForm({ ...form, acceptance: e.target.value })} />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || !form.title.trim()}>
                {busy ? "Saving…" : "Add task"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setForm(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <datalist id="task-people">
        {board.members.map((m) => (
          <option key={m.title} value={m.title} />
        ))}
      </datalist>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {COLUMNS.map((col) => {
          const tasks = board.tasks.filter((t) => t.status === col.status);
          return (
            <Card key={col.status} tone={col.tone} title={`${col.title} (${tasks.length})`}>
              {tasks.length === 0 && <p className="text-sm text-muted">{col.empty}</p>}
              <ul className="space-y-3">
                {tasks.map((task) => {
                  const isOpen = open === task.path;
                  const act = action?.path === task.path ? action : null;
                  return (
                    <li key={task.path} className="rounded-lg border border-black bg-bg p-3">
                      <button type="button" className="w-full text-left text-sm font-semibold hover:underline" onClick={() => setOpen(isOpen ? null : task.path)} aria-expanded={isOpen}>
                        {task.title}
                      </button>
                      <p className="mt-1 text-xs text-muted">
                        For {task.to || "anyone"}
                        {task.status !== "pending" && task.owner && ` · Owner: ${task.owner}`}
                        {task.created && ` · ${task.created}`}
                      </p>
                      {task.status === "done" && task.verifiedBy && <p className="mt-1 text-xs text-muted">Checked: {task.verifiedBy}</p>}
                      {task.status === "taken" && task.progress && <p className="mt-1 text-xs text-muted">Progress: {task.progress}</p>}
                      {!isOpen && task.what && <p className="mt-2 line-clamp-3 text-sm">{preview(task.what)}</p>}
                      {isOpen && (
                        <div className="mt-2">
                          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded border border-line p-2 font-sans text-xs">{task.text}</pre>
                          <a href={fileLink(board, task.path)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">
                            View on GitHub
                          </a>
                        </div>
                      )}

                      {act ? (
                        <form
                          className="mt-3 space-y-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            submitAction(task);
                          }}
                        >
                          {act.kind === "take" && (
                            <>
                              <label className="block text-xs">
                                Who takes it?
                                <input className={input} list="task-people" value={act.who} onChange={(e) => setAction({ ...act, who: e.target.value })} required autoFocus />
                              </label>
                              <label className="block text-xs">
                                Progress (optional)
                                <input className={input} value={act.text} onChange={(e) => setAction({ ...act, text: e.target.value })} />
                              </label>
                            </>
                          )}
                          {act.kind === "done" && (
                            <label className="block text-xs">
                              How was it checked?
                              <input className={input} value={act.text} onChange={(e) => setAction({ ...act, text: e.target.value })} placeholder="e.g. tried it on the live site" required autoFocus />
                            </label>
                          )}
                          {act.kind === "release" && (
                            <label className="block text-xs">
                              Handoff note: what&apos;s done, what&apos;s left
                              <textarea className={input} rows={2} value={act.text} onChange={(e) => setAction({ ...act, text: e.target.value })} required autoFocus />
                            </label>
                          )}
                          <div className="flex gap-2">
                            <Button type="submit" disabled={busy}>
                              {busy ? "Saving…" : act.kind === "take" ? "Take it" : act.kind === "done" ? "Move to Done" : "Release"}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setAction(null)} disabled={busy}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        task.status !== "done" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {task.status === "pending" && (
                              <Button className="py-1" onClick={() => setAction({ path: task.path, kind: "take", who: me, text: "" })} disabled={busy}>
                                Take
                              </Button>
                            )}
                            {task.status === "taken" && (
                              <>
                                <Button className="py-1" onClick={() => setAction({ path: task.path, kind: "done", who: me, text: "" })} disabled={busy}>
                                  Done
                                </Button>
                                <Button className="py-1" variant="ghost" onClick={() => setAction({ path: task.path, kind: "release", who: me, text: "" })} disabled={busy}>
                                  Release
                                </Button>
                              </>
                            )}
                          </div>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      <section className="mt-8" aria-label="Members">
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
          Members <Pill>{board.members.length}</Pill>
        </h3>
        {board.members.length === 0 ? (
          <p className="text-sm text-muted">Nobody is listed in COLLAB.md yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {board.members.map((m, i) => (
              <li key={m.title} className={`block-${(["pink", "cyan", "mustard", "green"] as const)[i % 4]} flex items-center gap-3 p-4`}>
                <Avatar name={m.name || m.title} className="size-14 text-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.name || m.title}</span>
                  <span className="block truncate text-xs">{m.role || m.title}</span>
                </span>
                <Link href="/chat" aria-label={`Message ${m.name || m.title}`} className="grid size-10 place-items-center rounded-full border border-black bg-paper">
                  <Icon name="message" className="size-4" />
                </Link>
                <Link href="/calls" aria-label={`Call ${m.name || m.title}`} className="grid size-10 place-items-center rounded-full border border-black bg-paper">
                  <Icon name="phone" className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>,
  );
}
