"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocalRepo } from "@/components/LocalRepo";
import { DiffView } from "@/components/DiffView";
import { FileTree } from "@/components/FileTree";
import { useAssistant } from "@/components/Assistant";
import { friendlyError } from "@/lib/errors";
import { downloadName, fileQuestion, textProblem } from "@/lib/file-tools";
import { Icon, type IconName } from "@/components/icons";
import { Button, Card, PageHeader, Skeleton, Tabs, buttonClass } from "@/components/ui";
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

  // One header for both modes, so the Web / Local folder switch stays in the same place and its thumb slides instead of
  // being rebuilt when the mode changes.
  return (
    <div className="max-w-6xl">
      <PageHeader title="Repository" subtitle={mode === "local" ? "Stage, commit, pull and push your clone with buttons." : "Pick a branch, edit a file, commit, then open a pull request."}>
        {tabs}
        <span className="hidden w-24 lg:block" aria-hidden />
      </PageHeader>
      {mode === "local" ? <LocalRepo /> : <GitHubRepo />}
    </div>
  );
}

function GitHubRepo() {
  const [fake, setFake] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [repo, setRepo] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [path, setPath] = useState<string | null>(null);
  const [original, setOriginal] = useState("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [changes, setChanges] = useState<Change[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [prTitle, setPrTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const assistant = useAssistant();
  const [copied, setCopied] = useState(false);
  // Left list (the person's choice; until then Changes if there are any, else Files) and what the right panel shows.
  const [listTab, setListTab] = useState<"changes" | "files" | null>(null);
  const [mode, setMode] = useState<"diff" | "edit">("diff");
  // The result banner sits at the top; bring it into view after a commit or pull request.
  const noteRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (note) noteRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [note]);

  const current = repos.find((r) => r.fullName === repo);
  const base = current?.defaultBranch ?? "main";
  const target = newBranch.trim() || branch; // typing a new name commits to (and creates) that branch

  // One place for errors: 401 means "log in", anything else is shown to the user.
  const fail = useCallback((e: unknown) => {
    if (e instanceof GitHubRequestError && e.status === 401) setNeedsLogin(true);
    else setNote({ kind: "error", text: friendlyError(e) });
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
      setMode("edit");
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
      setMode("diff");
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

  const diff = changes.find((c) => c.path === open);
  const edited = path !== null && text !== original;

  if (needsLogin)
    return (
      <div className="max-w-xl">
        <Card>
          <p className="mb-4 text-sm">Log in with GitHub to see your repositories.</p>
          <a href={signInHref("/repo")} className={buttonClass("primary", "inline-block")}>
            Continue with GitHub
          </a>
        </Card>
      </div>
    );

  // Files changed on this branch compared with the default branch (what its pull request would contain).
  const changed = branch === base ? [] : changes;
  const tab = listTab ?? (changed.length ? "changes" : "files");
  const fileOf = mode === "edit" ? path : (diff?.path ?? null);

  // The file tools act on what is open: the text in the editor (unsaved edits included), or the diff in the Diff view.
  const toolFile = mode === "edit" ? (path !== null ? { name: path, text, kind: "file" as const } : null) : diff ? { name: diff.path, text: diff.patch ?? "", kind: "diff" as const } : null;
  const textIssue = toolFile ? textProblem(toolFile.text) : "Open a file first";
  async function copyFile() {
    if (!toolFile || textIssue) return;
    try {
      await navigator.clipboard.writeText(toolFile.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setNote({ kind: "error", text: "Couldn't copy: your browser didn't allow it." });
    }
  }
  function downloadFile() {
    if (!toolFile || textIssue) return;
    const url = URL.createObjectURL(new Blob([toolFile.text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName(toolFile.name, toolFile.kind);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); // Safari reads the blob after the click
  }
  const askAbout = () => toolFile && assistant.ask(fileQuestion(toolFile.name, repo, branch, toolFile.kind, toolFile.kind === "diff" ? toolFile.text : ""), { repo, branch });
  const baseName = (p: string) => p.split("/").pop() ?? p;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <PillSelect
          label="Team"
          icon="user"
          value={repo}
          options={repos.map((r) => r.fullName)}
          onChange={(v) => {
            setRepo(v);
            // Chat opens this repo's chat next time, but never one from the signed-out sample list.
            if (!fake) setCurrentRepo(v);
          }}
        />
        <PillSelect label="Branch" icon="branch" value={branch} options={branches} onChange={setBranch} />
        <p className="ml-auto flex items-center gap-2 text-sm text-muted">
          {fake && <span className="rounded-full border border-line px-2.5 py-1 text-xs">demo data</span>}
          <span className="size-2 rounded-full bg-green" aria-hidden />
          {branch === base ? `on ${base}` : `${changed.length} changed ${changed.length === 1 ? "file" : "files"} vs ${base}`}
        </p>
      </div>

      <details className="mb-4 text-sm text-muted">
        <summary className="cursor-pointer text-white/85 hover:text-white">New to git? What these words mean</summary>
        <dl className="mt-2 max-w-3xl space-y-1">
          <div><dt className="inline font-medium text-white">Branch</dt> <dd className="inline">a separate copy of your work, so you can try things without touching main.</dd></div>
          <div><dt className="inline font-medium text-white">Commit</dt> <dd className="inline">saving your change with a short note about what you did.</dd></div>
          <div><dt className="inline font-medium text-white">Pull request (PR)</dt> <dd className="inline">asking your team to add your branch&apos;s changes to main.</dd></div>
          <div><dt className="inline font-medium text-white">Diff</dt> <dd className="inline">the lines you added (green) and removed (red).</dd></div>
        </dl>
      </details>

      {note && (
        <p
          ref={noteRef}
          role="status"
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

      <div className="grid gap-4 lg:grid-cols-[18.75rem_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <Tabs
              variant="paper"
              size="sm"
              label="Files"
              value={tab}
              onChange={(id) => setListTab(id as "changes" | "files")}
              tabs={[
                { id: "changes", label: `Changes ${changed.length}` },
                { id: "files", label: "Files" },
              ]}
              className="mb-3"
            />
            {tab === "changes" ? (
              changed.length === 0 ? (
                <p className="text-sm text-muted">{branch === base ? `You're on ${base}. Switch to another branch to see what its pull request would contain.` : "No changes yet: commit something first."}</p>
              ) : (
                <ul className="max-h-[26rem] space-y-1.5 overflow-y-auto">
                  {changed.map((c) => (
                    <li key={c.path}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(c.path);
                          setMode("diff");
                        }}
                        title={c.path}
                        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm ${open === c.path && mode === "diff" ? "border-black bg-cyan" : "border-transparent hover:bg-fg/10"}`}
                      >
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full border border-black text-[11px] font-semibold ${c.status === "added" ? "bg-green" : c.status === "deleted" ? "bg-clay" : "bg-mustard"}`}>
                          {c.status[0].toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{baseName(c.path)}</span>
                        <span className="shrink-0 text-xs">
                          <span className="rounded-full bg-green px-1.5 py-0.5">+{c.additions}</span> <span className="rounded-full bg-clay px-1.5 py-0.5">−{c.deletions}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <FileTree files={files} selected={mode === "edit" ? path : null} onOpen={openFile} />
            )}
          </Card>

          <Card tone="pink" title="Commit">
            <div className="-mt-9 mb-3 text-right text-sm">{edited ? "1 file" : "0 files"}</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What did you change?"
              aria-label="Commit message"
              rows={3}
              className="w-full rounded-xl border border-black bg-bg p-3 text-sm"
            />
            <input
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value.replace(/\s+/g, "-"))}
              placeholder="New branch (optional)"
              aria-label="New branch"
              className="mt-2 w-full rounded-full border border-black bg-bg px-4 py-2 text-sm"
            />
            {target === base && <p className="mt-2 text-xs">Tip: type a new branch name to keep {base} safe and open a pull request after.</p>}
            <Button onClick={commit} disabled={!edited || !message.trim() || busy !== null} className="mt-3 w-full py-3">
              {busy === "commit" ? "Committing…" : `Commit to ${target || "…"}`}
            </Button>
            {busy === null && (!edited || !message.trim()) && (
              <p className="mt-1.5 text-xs">{!edited ? "Edit a file first: Files list → pick a file → change it." : "Write what you changed to commit."}</p>
            )}
            <input
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              placeholder={`Pull request title (Changes from ${branch})`}
              aria-label="Pull request title"
              className="mt-3 w-full rounded-full border border-black bg-bg px-4 py-2 text-sm"
            />
            <Button variant="ghost" onClick={openPr} disabled={busy !== null || branch === base || !changed.length} className="mt-2 w-full bg-paper py-3">
              {busy === "pr" ? "Opening…" : `Open PR into ${base}`}
            </Button>
            {busy === null && (branch === base || !changed.length) && (
              <p className="mt-1.5 text-xs">{branch === base ? `Pick another branch first: a pull request needs changes on a branch, not on ${base}.` : "No changes on this branch yet."}</p>
            )}
            {edited && (
              <Button variant="ghost" onClick={() => window.confirm("Throw away your edits to this file?") && setText(original)} className="mt-2 flex w-full items-center justify-center gap-2 py-3">
                <Icon name="trash" className="size-4" /> Discard edits
              </Button>
            )}
          </Card>
        </div>

        <section className="min-w-0 overflow-hidden rounded-lg border border-white/15 bg-white/[0.04]" aria-label="File">
          <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold" title={fileOf ?? undefined}>{fileOf ? baseName(fileOf) : "No file picked"}</h2>
              <p className="truncate text-xs text-muted">{fileOf ?? "Pick a changed file to see its diff, or a file to edit."}</p>
            </div>
            <div className="order-last flex basis-full flex-wrap items-center gap-2" role="group" aria-label="File tools">
              <Button variant="glass" onClick={() => void copyFile()} disabled={!toolFile || !!textIssue} title={textIssue ?? (toolFile?.kind === "diff" ? "Copy the diff" : "Copy the file's text")} className="flex items-center gap-1.5 py-1.5! text-xs">
                <Icon name={copied ? "check" : "copy"} className="size-3.5" /> {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="glass" onClick={downloadFile} disabled={!toolFile || !!textIssue} title={textIssue ?? "Download it as a file"} className="flex items-center gap-1.5 py-1.5! text-xs">
                <Icon name="download" className="size-3.5" /> Download
              </Button>
              <Button variant="glass" onClick={askAbout} disabled={!toolFile} title={toolFile ? "Ask the Assistant about it" : "Open a file first"} className="flex items-center gap-1.5 py-1.5! text-xs">
                <Icon name="sparkle" className="size-3.5" /> Assistant
              </Button>
            </div>
            {mode === "diff" && diff && (
              <span className="flex gap-1.5 text-xs font-medium text-black">
                <span className="rounded-full bg-green px-2 py-0.5">+{diff.additions}</span>
                <span className="rounded-full bg-clay px-2 py-0.5">−{diff.deletions}</span>
              </span>
            )}
            <Tabs
              label="View"
              value={mode}
              onChange={(v) => {
                if (v === "edit" && path === null) setListTab("files");
                else setMode(v as "diff" | "edit");
              }}
              tabs={[
                { id: "diff", label: "Diff" },
                { id: "edit", label: "Edit" },
              ]}
            />
          </header>
          {mode === "edit" ? (
            path === null ? (
              <p className="p-5 text-sm text-muted">{busy === "file" ? "Opening…" : "Pick a file in the Files list to change it."}</p>
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={18}
                spellCheck={false}
                aria-label={`Editing ${path}`}
                className="block w-full resize-y bg-black/30 p-4 font-mono text-[13px] leading-6 text-white"
              />
            )
          ) : diff ? (
            <DiffView patch={diff.patch} />
          ) : (
            <p className="p-5 text-sm text-muted">{changed.length ? "Pick a changed file on the left." : "Nothing to compare yet. Edit a file and commit it to a new branch to see its diff here."}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function PillSelect({ label, icon, value, options, onChange }: { label: string; icon: IconName; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="glass relative flex min-w-[14rem] max-w-full items-center gap-3 rounded-full py-2 pl-4 pr-4 xl:min-w-[17.5rem]">
      <Icon name={icon} className="size-4 text-white/80" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-white/75">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="block w-full max-w-[16rem] appearance-none truncate bg-transparent text-sm font-medium text-white outline-none">
          {options.map((o) => (
            <option key={o} className="bg-[#2a2a2a]">
              {o}
            </option>
          ))}
        </select>
      </span>
      <Icon name="chevron" className="size-4 text-white/80" />
    </label>
  );
}
