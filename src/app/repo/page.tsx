"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocalRepo } from "@/components/LocalRepo";
import { DiffView } from "@/components/DiffView";
import { useAssistant } from "@/components/Assistant";
import { BackButton } from "@/components/BackButton";
import { Icon, type IconName } from "@/components/icons";
import { Button, Card, PageHeader, Tabs, buttonClass } from "@/components/ui";
import { CodeEditor } from "@/components/repo/CodeEditor";
import { AskCard, Envelope, Notes, PhoneDock, type DeskNote } from "@/components/repo/Desk";
import { IndexDrawer, type RowMeta } from "@/components/repo/IndexDrawer";
import { Shelf, spineKey } from "@/components/repo/Shelf";
import { StartPanel } from "@/components/repo/StartPanel";
import { StepRail } from "@/components/repo/StepRail";
import { setCurrentRepo } from "@/lib/current-repo";
import { currentStep, editPatch, lineChanges } from "@/lib/desk";
import { folderEntries, folderOf, type DrawerFilter } from "@/lib/drawer";
import { friendlyError } from "@/lib/errors";
import { downloadName, fileQuestion, textProblem } from "@/lib/file-tools";
import { isDesktop } from "@/lib/local-git";
import {
  commitFiles,
  getChanges,
  getSession,
  GitHubRequestError,
  lastChanges,
  listBranches,
  listCommits,
  listFiles,
  listRepos,
  openPullRequest,
  readFile,
  signInHref,
  type Activity,
  type Change,
  type PullRequest,
  type Repo,
} from "@/lib/github-client";

type Note = { kind: "ok" | "error"; text: string; href?: string };
type Doc = { original: string; text: string };
type View = "diff" | "edit";

const SHELF = 14; // commits on the "Recent saves" shelf
const baseName = (p: string) => p.split("/").pop() ?? p;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// Who last changed each file, per repo, branch and path, kept while the app is open (null = GitHub had nothing).
const metaCache = new Map<string, RowMeta | null>();

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

  // One switch for both modes, in the same top-right spot, so its thumb slides instead of being rebuilt.
  return (
    <div className="relative max-w-6xl">
      {desktop && (
        <div className="mb-4 flex justify-end lg:absolute lg:right-0 lg:top-0 lg:z-10 lg:mb-0">
          <Tabs
            label="Repository mode"
            size="sm"
            value={mode}
            onChange={(id) => choose(id as "github" | "local")}
            tabs={[
              { id: "github", label: "Web" },
              { id: "local", label: "Local folder" },
            ]}
          />
        </div>
      )}
      {mode === "local" ? (
        <>
          <PageHeader title="Repository" subtitle="Stage, commit, pull and push your clone with buttons." />
          <LocalRepo />
        </>
      ) : (
        <GitHubRepo roomForTabs={desktop} />
      )}
    </div>
  );
}

/** The width of the page's own content area (it changes with the sidebar, not only with the window). */
function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

// The web Repository page (PLAN/2026-10-22-repo-page-magic.md, Figma page "repo page idea"): the repo name is the repo
// picker, a step rail says where you are (Pick a file → Change it → Save to a branch → Ask the team), the index drawer
// browses folders as colour tabs, the editor marks your changes, and the desk holds every unsaved file as a sticky note
// until you save them all in one commit. The "Recent saves" shelf shows the branch's latest commits.
function GitHubRepo({ roomForTabs }: { roomForTabs: boolean }) {
  // From 1000 px of content: drawer, editor and desk side by side. From 672 px: drawer and editor, the desk docks at the
  // bottom. Narrower (phones): one column, the drawer folds to the open file.
  const root = useRef<HTMLDivElement>(null);
  const width = useWidth(root);
  const wide = width >= 1000;
  const narrow = width > 0 && width < 672;
  const [fake, setFake] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [repo, setRepo] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<Change[]>([]);
  const [commits, setCommits] = useState<Activity[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [readme, setReadme] = useState<{ path: string; text: string } | null>(null);
  // Every file opened on this branch: its text as on GitHub and as edited. Edited ones are the desk's notes.
  const [docs, setDocs] = useState<Record<string, Doc>>({});
  const [path, setPath] = useState<string | null>(null);
  const [view, setView] = useState<View>("edit");
  const [folder, setFolder] = useState("");
  const [filter, setFilter] = useState<DrawerFilter>("all");
  const [metaTick, setMetaTick] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [branchInput, setBranchInput] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [pr, setPr] = useState<PullRequest | null>(null);
  const [busy, setBusy] = useState<"file" | "commit" | "pr" | null>(null);
  const [flying, setFlying] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [copied, setCopied] = useState(false);
  const assistant = useAssistant();

  const docsRef = useRef(docs);
  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);
  // What to keep when the next branch loads: the open file, and whether the opened texts still hold (after a save).
  const keep = useRef<{ path: string | null; docs: boolean }>({ path: null, docs: false });
  const dropNext = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);
  const askRef = useRef<HTMLDivElement>(null);
  const fileBox = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (note) noteRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [note]);

  const current = repos.find((r) => r.fullName === repo);
  const base = current?.defaultBranch ?? "main";
  const target = newBranch.trim() || branch; // typing a new name saves to (and creates) that branch

  // One place for errors: 401 means "log in", anything else is shown to the user.
  const fail = useCallback((e: unknown) => {
    if (e instanceof GitHubRequestError && e.status === 401) setNeedsLogin(true);
    else setNote({ kind: "error", text: friendlyError(e) });
  }, []);

  // The newest spine drops onto the shelf after a save.
  const showCommits = useCallback((log: Activity[]) => {
    setCommits(log);
    if (dropNext.current && log[0]) {
      dropNext.current = false;
      const key = spineKey(log[0]);
      setFresh(key);
      window.setTimeout(() => setFresh((k) => (k === key ? null : k)), 1500);
    }
  }, []);

  useEffect(() => {
    getSession()
      .then((s) => {
        setFake(s.fake);
        if (!s.user) return setNeedsLogin(true);
        return listRepos().then((rs) => {
          setRepos(rs);
          if (rs[0]) setRepo(rs[0].fullName);
          else setLoading(false);
        });
      })
      .catch(fail);
  }, [fail]);

  useEffect(() => {
    if (!repo) return;
    listBranches(repo)
      .then((bs) => {
        setBranches(bs);
        // Start on the default branch, so a new branch builds on the latest work.
        setBranch((b) => b || (bs.includes(base) ? base : (bs[0] ?? base)));
      })
      .catch(fail);
  }, [repo, base, fail]);

  const loadBranch = useCallback(
    async (r: string, b: string) => {
      const k = keep.current;
      keep.current = { path: null, docs: false };
      setLoading(true);
      try {
        const [fs, cs] = await Promise.all([listFiles(r, b), getChanges(r, b)]);
        setFiles(fs);
        setChanges(cs);
        if (k.path && fs.includes(k.path)) {
          if (!k.docs) {
            const content = (await readFile(r, b, k.path)) ?? "";
            setDocs({ [k.path]: { original: content, text: content } });
          }
        } else {
          if (!k.docs) setDocs({});
          setPath(null);
          setFolder((f) => (f && fs.some((p) => p.startsWith(`${f}/`)) ? f : ""));
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!repo || !branch) return;
    loadBranch(repo, branch).catch(fail);
    listCommits(repo, SHELF, branch).then(showCommits, () => setCommits([]));
  }, [repo, branch, loadBranch, fail, showCommits]);

  // The README's opening for the start panel.
  useEffect(() => {
    setReadme(null);
    const p = files.find((f) => /^readme(\.md|\.markdown|\.txt)?$/i.test(f));
    if (!repo || !branch || !p) return;
    let live = true;
    readFile(repo, branch, p)
      .then((t) => live && t != null && setReadme({ path: p, text: t }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [repo, branch, files]);

  // Who last changed each file in the open folder (q6:a: this folder only, at most 30, remembered).
  const metaKey = useCallback((p: string) => `${repo}@${branch}:${p}`, [repo, branch]);
  useEffect(() => {
    if (!repo || !branch || needsLogin) return;
    const want = folderEntries(files, folder)
      .files.map((f) => f.path)
      .filter((p) => !metaCache.has(metaKey(p)))
      .slice(0, 30);
    if (!want.length) return;
    let live = true;
    lastChanges(repo, branch, want)
      .then((found) => {
        for (const p of want) metaCache.set(metaKey(p), found[p] ?? null);
        if (live) setMetaTick((t) => t + 1);
      })
      .catch(() => {
        for (const p of want) metaCache.set(metaKey(p), null);
      });
    return () => {
      live = false;
    };
  }, [repo, branch, folder, files, needsLogin, metaKey]);
  const meta = useCallback((p: string) => (metaTick >= 0 ? (metaCache.get(metaKey(p)) ?? undefined) : undefined), [metaKey, metaTick]);

  const focusSearch = useCallback(() => {
    setDrawerOpen(true);
    setFilter("all");
    window.setTimeout(() => {
      searchRef.current?.focus();
      searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, []);
  // ⌘K / Ctrl+K: Go to file.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [focusSearch]);

  const openFile = async (p: string, v: View = "edit") => {
    setPath(p);
    setView(v);
    setDrawerOpen(false);
    setFolder(folderOf(p));
    if (narrow) window.setTimeout(() => fileBox.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    if (docsRef.current[p]) return;
    setBusy("file");
    try {
      const content = (await readFile(repo, branch, p)) ?? "";
      setDocs((d) => (d[p] ? d : { ...d, [p]: { original: content, text: content } }));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const edit = (text: string) => path && setDocs((d) => (d[path] ? { ...d, [path]: { ...d[path], text } } : d));

  const notes: DeskNote[] = useMemo(
    () =>
      Object.entries(docs)
        .filter(([, d]) => d.text !== d.original)
        .map(([p, d]) => {
          const { added, removed } = lineChanges(d.original, d.text);
          return { path: p, added, removed };
        }),
    [docs],
  );
  const edited = useMemo(() => new Set(notes.map((n) => n.path)), [notes]);
  // Files changed on this branch compared with the default branch (what its pull request would contain).
  const changed = useMemo(() => (branch && branch !== base ? changes : []), [branch, base, changes]);
  const branchChanged = useMemo(() => new Set(changed.map((c) => c.path)), [changed]);
  const changedOrEdited = useMemo(() => new Set([...branchChanged, ...edited]), [branchChanged, edited]);

  const switchRepo = (r: string) => {
    if (r === repo) return;
    if (notes.length && !window.confirm(`Open ${r} and throw away your unsaved edits to ${plural(notes.length, "file")}?`)) return;
    setRepo(r);
    setBranch("");
    setBranches([]);
    setFiles([]);
    setDocs({});
    setPath(null);
    setFolder("");
    setFilter("all");
    setCommits([]);
    setPr(null);
    setLoading(true);
    // Chat opens this repo's chat next time, but never one from the signed-out sample list.
    if (!fake) setCurrentRepo(r);
  };
  const switchBranch = (b: string) => {
    if (b === branch) return;
    if (notes.length && !window.confirm(`Switch to ${b} and throw away your unsaved edits to ${plural(notes.length, "file")}?`)) return;
    keep.current = { path, docs: false };
    setPr(null);
    setBranch(b);
  };

  const why = !notes.length ? "Edit a file first: pick one in the drawer and change it." : !message.trim() ? "Write what you changed to save." : null;

  const save = async () => {
    if (why) return;
    const sent = Object.fromEntries(notes.map((n) => [n.path, docsRef.current[n.path].text]));
    const saving = Object.keys(sent);
    setBusy("commit");
    try {
      // A new branch starts from the branch the files came from (not from the default branch).
      const c = await commitFiles(repo, target, saving.map((p) => ({ path: p, content: sent[p] })), message.trim(), branch);
      const motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setFlying(true);
      if (motion) await new Promise((r) => window.setTimeout(r, 40 * saving.length + 440));
      setFlying(false);
      setSealing(true);
      window.setTimeout(() => setSealing(false), 520);
      setDocs((d) => {
        const next = { ...d };
        for (const p of saving) if (next[p]) next[p] = { ...next[p], original: sent[p] };
        return next;
      });
      for (const p of saving) metaCache.delete(`${repo}@${c.branch}:${p}`);
      setNote({ kind: "ok", text: `Saved “${message.trim()}” to ${c.branch}.`, href: c.url });
      setMessage("");
      setNewBranch("");
      setBranchInput(false);
      setDockOpen(false);
      setPr(null);
      dropNext.current = true;
      if (!branches.includes(c.branch)) setBranches((bs) => [...bs, c.branch]);
      if (c.branch !== branch) {
        keep.current = { path, docs: true };
        setBranch(c.branch);
      } else {
        const [cs, log] = await Promise.all([getChanges(repo, branch), listCommits(repo, SHELF, branch)]);
        setChanges(cs);
        showCommits(log);
        setMetaTick((t) => t + 1);
      }
    } catch (e) {
      setFlying(false);
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const openPr = async () => {
    setBusy("pr");
    try {
      const p = await openPullRequest(repo, branch, base, prTitle.trim() || `Changes from ${branch}`);
      setPr(p);
      setNote({ kind: "ok", text: `Pull request #${p.number} is open: ${p.head} → ${p.base}.`, href: p.url });
      setPrTitle("");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const discardAll = () => {
    if (!window.confirm(`Throw away your unsaved edits to ${plural(notes.length, "file")}?`)) return;
    setDocs((d) => Object.fromEntries(Object.entries(d).map(([p, x]) => [p, { ...x, text: x.original }])));
    setDockOpen(false);
  };

  const step = currentStep({ fileOpen: path !== null, edits: notes.length, branchChanged: changed.length > 0, pullRequest: pr !== null });
  // A changed line counts once (not as one removed plus one added).
  const lines = notes.reduce((s, n) => s + Math.max(n.added, n.removed), 0);
  const steps = [
    { title: "Pick a file", sub: path ? baseName(path) : "From the drawer or ⌘K" },
    { title: "Change it", sub: notes.length ? `${plural(lines, "line")} changed` : "Edit right here" },
    { title: "Save to a branch", sub: notes.length ? target || "…" : branch && branch !== base ? `Saved on ${branch}` : `A new branch keeps ${base} safe` },
    { title: "Ask the team", sub: pr ? `Pull request #${pr.number} is open` : `Pull request into ${base}` },
  ];
  const pickStep = (n: number) => {
    if (n === 1 || (n === 2 && !path)) return focusSearch();
    if (n === 2) {
      setView("edit");
      window.setTimeout(() => editorRef.current?.focus(), 0);
    } else if (n === 3) {
      if (!notes.length) return focusSearch();
      if (!wide) setDockOpen(true);
      window.setTimeout(() => messageRef.current?.focus(), 0);
    } else askRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (needsLogin)
    return (
      <div className="max-w-xl">
        <PageHeader title="Repository" />
        <Card>
          <p className="mb-4 text-sm">Log in with GitHub to see your repositories.</p>
          <a href={signInHref("/repo")} className={buttonClass("primary", "inline-block")}>
            Continue with GitHub
          </a>
        </Card>
      </div>
    );

  const doc = path ? docs[path] : undefined;
  const isEdited = !!doc && doc.text !== doc.original;
  const branchDiff = path ? changed.find((c) => c.path === path) : undefined;
  const shownPatch = doc && isEdited ? editPatch(doc.original, doc.text) : (branchDiff?.patch ?? "");
  const diffCaption = isEdited ? "Your edits, not saved yet" : branchDiff ? `What ${branch} changed compared with ${base}` : "";

  // The file tools act on what is open: the text in the editor (unsaved edits included), or the diff in the Diff view.
  const toolFile = path === null ? null : view === "edit" ? (doc ? { name: path, text: doc.text, kind: "file" as const } : null) : { name: path, text: shownPatch, kind: "diff" as const };
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

  const [owner, name] = repo.includes("/") ? repo.split("/") : ["", repo];
  const tools: [IconName, string, () => void, string | null][] = [
    [copied ? "check" : "copy", copied ? "Copied" : "Copy", () => void copyFile(), textIssue ?? (toolFile?.kind === "diff" ? "Copy the diff" : "Copy the file's text")],
    ["download", "Download", downloadFile, textIssue ?? "Download it as a file"],
    ["sparkle", "Ask Assistant", askAbout, toolFile ? "Ask the Assistant about it" : "Open a file first"],
  ];

  const envelope = (head?: React.ReactNode) => (
    <Envelope
      message={message}
      onMessage={setMessage}
      target={target}
      base={base}
      newBranch={newBranch}
      onNewBranch={setNewBranch}
      branchInput={branchInput || branch === base}
      onBranchInput={setBranchInput}
      onSave={() => void save()}
      busy={busy === "commit"}
      why={why}
      messageRef={messageRef}
      envelopeRef={envelopeRef}
      sealing={sealing}
      head={head}
    />
  );
  const ask = (
    <AskCard
      branch={branch}
      base={base}
      changedCount={changed.length}
      edits={notes.length}
      pr={pr}
      prTitle={prTitle}
      onPrTitle={setPrTitle}
      onOpenPr={() => void openPr()}
      busy={busy === "pr"}
      cardRef={askRef}
    />
  );

  return (
    <div ref={root} className="@container">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-3">
          <BackButton />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">{owner ? `Repository · ${owner}` : "Repository"}</p>
            <label className="relative mt-1 flex max-w-full items-center gap-2 rounded-lg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-accent-soft">
              <span className="truncate font-serif text-[2.75rem] leading-[1.05] text-white lg:text-[3.5rem]">{name || "Repository"}</span>
              {repos.length > 0 && <Icon name="chevron" className="size-6 shrink-0 text-white/75" />}
              <select value={repo} onChange={(e) => switchRepo(e.target.value)} aria-label="Repository" className="absolute inset-0 cursor-pointer opacity-0">
                {repos.map((r) => (
                  <option key={r.fullName} value={r.fullName} className="bg-[#2a2a2a]">
                    {r.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
              <span>on</span>
              <label className="glass relative inline-flex max-w-[16rem] items-center gap-1.5 rounded-full py-1 pl-2.5 pr-3 font-medium text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-soft">
                <Icon name="branch" className="size-4 shrink-0" />
                <span className="truncate">{branch || "…"}</span>
                <Icon name="chevron" className="size-3.5 shrink-0" />
                <select value={branch} onChange={(e) => switchBranch(e.target.value)} aria-label="Branch" className="absolute inset-0 cursor-pointer opacity-0">
                  {branches.map((b) => (
                    <option key={b} value={b} className="bg-[#2a2a2a]">
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              {branch && branch !== base ? (
                <>
                  <span aria-hidden className="size-2 rounded-full bg-green" />
                  <span>{`${plural(changed.length, "changed file")} vs ${base}`}</span>
                </>
              ) : (
                <span>the team&apos;s shared copy</span>
              )}
              {fake && <span className="rounded-full border border-white/25 px-2.5 py-0.5 text-xs">demo data</span>}
            </div>
          </div>
        </div>
        <div className={roomForTabs ? "lg:pt-16" : ""}>
          <Shelf commits={commits} fresh={fresh} />
        </div>
      </header>

      <StepRail steps={steps} current={step} onPick={pickStep} />

      {note && (
        <p
          ref={noteRef}
          role="status"
          className={`mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${note.kind === "ok" ? "border-added/40 bg-added/10" : "border-removed/40 bg-removed/10"}`}
        >
          <span className="flex-1">
            {note.text}{" "}
            {note.href && (
              <a href={note.href} target="_blank" rel="noreferrer" className="underline">
                View on GitHub
              </a>
            )}
          </span>
          <button onClick={() => setNote(null)} className="text-xs text-muted" aria-label="Dismiss">
            ✕
          </button>
        </p>
      )}

      <div className="grid gap-5 @min-[42rem]:grid-cols-[minmax(14rem,17rem)_minmax(0,1fr)] @min-[62.5rem]:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)_minmax(13.5rem,15rem)]">
        <IndexDrawer
          files={files}
          loading={loading}
          rootLabel={name || "Repository"}
          folder={folder}
          onFolder={(f) => {
            setFolder(f);
            setFilter("all");
          }}
          selected={path}
          onOpen={(p, v) => void openFile(p, v)}
          changed={changedOrEdited}
          branchChanged={branchChanged}
          edited={edited}
          meta={meta}
          filter={filter}
          onFilter={setFilter}
          searchRef={searchRef}
          folded={narrow && path !== null && !drawerOpen}
          onUnfold={() => setDrawerOpen(true)}
        />

        <section ref={fileBox} aria-label="File" className="min-w-0 scroll-mt-4 self-start overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04]">
          {path === null ? (
            <StartPanel readme={readme} onOpen={(p) => void openFile(p)} lately={commits} onSearch={focusSearch} />
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-5 pb-3.5 pt-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold" title={path}>
                    {baseName(path)}
                  </h2>
                  <p className="truncate text-xs text-muted">{path}</p>
                </div>
                {isEdited && <span className="rounded-md bg-mustard px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-black">Not saved</span>}
                <Tabs
                  label="View"
                  size="sm"
                  value={view}
                  onChange={(v) => setView(v as View)}
                  tabs={[
                    { id: "diff", label: "Diff" },
                    { id: "edit", label: "Edit" },
                  ]}
                />
                <div className="flex basis-full flex-wrap items-center gap-2" role="group" aria-label="File tools">
                  {tools.map(([icon, label, run, title]) => (
                    <Button key={label} variant="glass" onClick={run} disabled={label === "Ask Assistant" ? !toolFile : !!textIssue} title={title ?? undefined} className="flex items-center gap-1.5 py-1.5! text-xs">
                      <Icon name={icon} className="size-3.5" /> {label}
                    </Button>
                  ))}
                </div>
              </header>
              <div className="border-t border-white/10">
                {!doc && busy === "file" ? (
                  <p className="p-5 text-sm text-muted">Opening…</p>
                ) : view === "edit" ? (
                  doc ? (
                    <CodeEditor value={doc.text} original={doc.original} onChange={edit} label={`Editing ${path}`} editorRef={editorRef} />
                  ) : (
                    <p className="p-5 text-sm text-muted">This file couldn&apos;t be opened.</p>
                  )
                ) : shownPatch ? (
                  <>
                    <p className="px-5 pt-3 text-xs text-muted">{diffCaption}</p>
                    <DiffView patch={shownPatch} />
                  </>
                ) : (
                  <p className="p-5 text-sm text-muted">{`No changes in this file yet${branch === base ? "" : ` on ${branch}`}. Switch to Edit to change it.`}</p>
                )}
              </div>
            </>
          )}
        </section>

        {wide ? (
          <aside aria-label="Your desk" className="sticky top-6 min-w-0 space-y-4 self-start">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">Your desk</h2>
              <span className="text-xs text-white/55">{notes.length ? plural(notes.length, "changed file") : "nothing yet"}</span>
            </div>
            {notes.length ? (
              <Notes notes={notes} onOpen={(p) => void openFile(p)} flying={flying} target={envelopeRef} />
            ) : (
              <p className="ml-6 w-40 rotate-2 rounded border border-dashed border-white/30 p-3 text-xs text-white/60">Edit a file and it lands here as a note.</p>
            )}
            {notes.length > 0 && envelope()}
            {ask}
            {notes.length > 0 && (
              <button type="button" onClick={discardAll} className="text-xs text-white/55 underline underline-offset-2 hover:text-white">
                Throw away my edits
              </button>
            )}
          </aside>
        ) : (
          <div className="min-w-0 @min-[42rem]:col-start-2">{ask}</div>
        )}
      </div>

      {!wide && notes.length > 0 && (
        <PhoneDock
          notes={notes}
          open={dockOpen}
          onOpen={(o) => {
            setDockOpen(o);
            if (o) window.setTimeout(() => messageRef.current?.focus(), 0);
          }}
          onOpenFile={(p) => void openFile(p)}
          flying={flying}
          envelopeRef={envelopeRef}
          envelope={envelope(
            <div className="mb-3 flex items-start gap-3">
              <Notes notes={notes} onOpen={(p) => void openFile(p)} flying={flying} target={envelopeRef} small />
              <span className="min-w-0 flex-1 pt-1 text-xs text-black/65">{`${plural(notes.length, "changed file")}: ${notes.map((n) => baseName(n.path)).join(", ")}`}</span>
              <button type="button" onClick={() => setDockOpen(false)} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full border border-black/20">
                <Icon name="chevron" className="size-4" />
              </button>
            </div>,
          )}
        />
      )}
    </div>
  );
}
