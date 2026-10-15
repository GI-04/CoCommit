"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LocalRepo } from "@/components/LocalRepo";
import { Button, Card, PageHeader, Tabs } from "@/components/ui";
import { setCurrentRepo } from "@/lib/current-repo";
import { isDesktop } from "@/lib/local-git";
import {
  commitFiles,
  getChanges,
  getSession,
  GitHubRequestError,
  listBranches,
  listFiles,
  listRepos,
  openPullRequest,
  readFile,
  signInHref,
  type Change,
  type Repo,
} from "@/lib/github-client";

const badge: Record<Change["status"], string> = { added: "text-added", modified: "text-accent-soft", deleted: "text-removed" };
const field = "rounded-md border border-line bg-surface px-2 py-2 text-sm";
const glassSelect = "glass max-w-[14rem] rounded-full bg-transparent py-2.5 pl-4 pr-9 text-sm text-white";

type Note = { kind: "ok" | "error"; text: string; href?: string };

// In the desktop app the Repo page has two modes: GitHub (through the API, as on the website) and
// Local (a clone on this computer, through the user's own git). The website only has GitHub mode.
export default function RepoPage() {
  const [desktop, setDesktop] = useState(false);
  const [mode, setMode] = useState<"github" | "local">("github");
  useEffect(() => {
    if (!isDesktop()) return;
    setDesktop(true);
    try {
      if (localStorage.getItem("cocommitRepoMode") === "local") setMode("local");
    } catch {}
  }, []);
  const choose = (m: "github" | "local") => {
    setMode(m);
    try {
      localStorage.setItem("cocommitRepoMode", m);
    } catch {}
  };

  const tabs = desktop && (
    <Tabs
      label="Repository mode"
      value={mode}
      onChange={(id) => choose(id as "github" | "local")}
      tabs={[
        { id: "github", label: "Web" },
        { id: "local", label: "Local folder" },
      ]}
    />
  );

  if (mode === "local")
    return (
      <div className="max-w-6xl">
        <PageHeader title="Repository" subtitle="Your clone on this computer: stage, commit, pull and push with buttons.">
          {tabs}
        </PageHeader>
        <LocalRepo />
      </div>
    );
  return <GitHubRepo modeTabs={tabs || null} />;
}

function GitHubRepo({ modeTabs }: { modeTabs: React.ReactNode }) {
  const [fake, setFake] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [repo, setRepo] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [path, setPath] = useState<string | null>(null);
  const [original, setOriginal] = useState("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [changes, setChanges] = useState<Change[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [prTitle, setPrTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);

  const current = repos.find((r) => r.fullName === repo);
  const base = current?.defaultBranch ?? "main";
  const target = newBranch.trim() || branch; // typing a new name commits to (and creates) that branch

  // One place for errors: 401 means "log in", anything else is shown to the user.
  const fail = useCallback((e: unknown) => {
    if (e instanceof GitHubRequestError && e.status === 401) setNeedsLogin(true);
    else setNote({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
  }, []);

  useEffect(() => {
    getSession()
      .then((s) => {
        setFake(s.fake);
        if (!s.user) return setNeedsLogin(true);
        return listRepos().then((rs) => {
          setRepos(rs);
          if (rs[0]) setRepo(rs[0].fullName);
        });
      })
      .catch(fail);
  }, [fail]);

  const loadBranch = useCallback(
    async (r: string, b: string) => {
      setPath(null);
      setOpen(null);
      const [fs, cs] = await Promise.all([listFiles(r, b), getChanges(r, b)]);
      setFiles(fs);
      setChanges(cs);
      setOpen(cs[0]?.path ?? null);
    },
    [],
  );

  useEffect(() => {
    if (!repo) return;
    listBranches(repo)
      .then((bs) => {
        setBranches(bs);
        // Start on the default branch, so a new branch builds on the latest work.
        const start = bs.includes(base) ? base : (bs[0] ?? base);
        setBranch(start);
      })
      .catch(fail);
  }, [repo, base, fail]);

  useEffect(() => {
    if (repo && branch) loadBranch(repo, branch).catch(fail);
  }, [repo, branch, loadBranch, fail]);

  const openFile = async (p: string) => {
    setBusy("file");
    try {
      const content = (await readFile(repo, branch, p)) ?? "";
      setPath(p);
      setOriginal(content);
      setText(content);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const commit = async () => {
    if (!path) return;
    setBusy("commit");
    try {
      // A new branch starts from the branch the file was opened on (not from the default branch).
      const c = await commitFiles(repo, target, [{ path, content: text }], message.trim(), branch);
      setNote({ kind: "ok", text: `Committed “${message.trim()}” to ${c.branch}.`, href: c.url });
      setMessage("");
      setOriginal(text);
      if (!branches.includes(c.branch)) setBranches((bs) => [...bs, c.branch]);
      setNewBranch("");
      if (c.branch !== branch) setBranch(c.branch);
      else await loadBranch(repo, branch);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const openPr = async () => {
    setBusy("pr");
    try {
      const pr = await openPullRequest(repo, branch, base, prTitle.trim() || `Changes from ${branch}`);
      setNote({ kind: "ok", text: `Pull request #${pr.number} is open: ${pr.head} → ${pr.base}.`, href: pr.url });
      setPrTitle("");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(() => files.filter((f) => f.toLowerCase().includes(filter.toLowerCase())).slice(0, 200), [files, filter]);
  const diff = changes.find((c) => c.path === open);
  const edited = path !== null && text !== original;

  if (needsLogin)
    return (
      <div className="max-w-xl">
        <PageHeader title="Repository" subtitle="Commit and open pull requests with buttons." />
        <Card>
          <p className="mb-4 text-sm">Log in with GitHub to see your repositories.</p>
          <a href={signInHref("/repo")} className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            Continue with GitHub
          </a>
        </Card>
      </div>
    );

  return (
    <div className="max-w-6xl">
      <PageHeader title="Repository" subtitle="Pick a branch, edit a file, commit, then open a pull request.">
        {modeTabs}
        <div className="flex flex-wrap items-center gap-2">
          {fake && <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">demo data</span>}
          <select
            value={repo}
            onChange={(e) => {
              setRepo(e.target.value);
              // Chat opens this repo's chat next time, but never one from the signed-out sample list.
              if (!fake) setCurrentRepo(e.target.value);
            }}
            className={glassSelect}
            aria-label="Repository"
          >
            {repos.map((r) => (
              <option key={r.fullName}>{r.fullName}</option>
            ))}
          </select>
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={glassSelect} aria-label="Branch">
            {branches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
      </PageHeader>

      {note && (
        <p
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${note.kind === "ok" ? "border-added/40 bg-added/10" : "border-removed/40 bg-removed/10"}`}
        >
          {note.text}{" "}
          {note.href && (
            <a href={note.href} target="_blank" rel="noreferrer" className="underline">
              View on GitHub
            </a>
          )}
          <button onClick={() => setNote(null)} className="ml-2 text-xs text-muted" aria-label="Dismiss">
            ✕
          </button>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Card title={`Files on ${branch || "…"}`}>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a file" className={`${field} mb-2 w-full bg-bg`} />
          <ul className="max-h-[28rem] space-y-0.5 overflow-y-auto">
            {shown.map((f) => (
              <li key={f}>
                <button
                  onClick={() => openFile(f)}
                  className={`w-full truncate rounded-md border px-2 py-1.5 text-left text-sm ${path === f ? "border-black bg-cyan font-medium" : "border-transparent hover:bg-fg/10"}`}
                >
                  {f}
                </button>
              </li>
            ))}
            {!shown.length && <li className="px-2 text-sm text-muted">{files.length ? "No match." : "Loading…"}</li>}
          </ul>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card tone="pink" title={path ? `Editing ${path}` : "Edit a file"}>
            {path === null ? (
              <p className="text-sm text-muted">{busy === "file" ? "Opening…" : "Pick a file on the left to change it."}</p>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={14}
                  spellCheck={false}
                  className="w-full rounded-md border border-line bg-bg p-2 font-mono text-sm"
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
                  <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What did you change?" className={`${field} bg-bg`} />
                  <input
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value.replace(/\s+/g, "-"))}
                    placeholder="New branch (optional)"
                    className={`${field} bg-bg`}
                  />
                  <Button onClick={commit} disabled={!edited || !message.trim() || busy !== null}>
                    {busy === "commit" ? "Committing…" : `Commit to ${target}`}
                  </Button>
                </div>
                {target === base && <p className="mt-2 text-xs text-muted">Tip: type a new branch name to keep {base} safe and open a pull request after.</p>}
              </>
            )}
          </Card>

          <Card tone="dark" title={branch === base ? `Changes (you're on ${base})` : `Changes on ${branch} compared with ${base} (${changes.length})`}>
            {branch === base || !changes.length ? (
              <p className="text-sm text-muted">{branch === base ? "Switch to another branch to see what its pull request would contain." : "No changes yet: commit something first."}</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-1">
                  {changes.map((c) => (
                    <button
                      key={c.path}
                      onClick={() => setOpen(c.path)}
                      className={`rounded-full border px-3 py-1 text-xs ${open === c.path ? "border-white bg-white/15" : "border-line hover:bg-fg/10"}`}
                    >
                      <span className={badge[c.status]}>{c.status[0].toUpperCase()}</span> {c.path}
                    </button>
                  ))}
                </div>
                {diff && (
                  <pre className="mb-3 max-h-80 overflow-auto rounded-md bg-black/30 p-2 font-mono text-[13px] leading-6">
                    {(diff.patch || "(no text changes to show)").split("\n").map((line, i) => (
                      <div
                        key={i}
                        className={
                          line.startsWith("+") ? "bg-added/10 text-added" : line.startsWith("-") ? "bg-removed/10 text-removed" : line.startsWith("@@") ? "text-muted" : ""
                        }
                      >
                        {line || " "}
                      </div>
                    ))}
                  </pre>
                )}
                <div className="flex gap-2">
                  <input value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder={`Changes from ${branch}`} className="min-w-0 flex-1 rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-white placeholder:text-muted" />
                  <Button onClick={openPr} disabled={busy !== null}>
                    {busy === "pr" ? "Opening…" : `Open PR into ${base}`}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
