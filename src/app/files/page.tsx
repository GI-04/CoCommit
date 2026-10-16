"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Button, Card, PageHeader, Skeleton } from "@/components/ui";
import { getCurrentRepo } from "@/lib/current-repo";
import { friendlyError } from "@/lib/errors";
import {
  createSharedFolder,
  deleteSharedFile,
  deleteSharedFolder,
  listShared,
  saveSharedFile,
  uploadSharedFile,
  type SharedFile,
  type SharedListing,
} from "@/lib/files";
import { crumbs, folderView, FOLDER_MARKER, formatSize, MAX_FILE_BYTES, MAX_FOLDER_DEPTH, pathsInFolder, sharedPath } from "@/lib/files-util";
import { GitHubRequestError, signInHref } from "@/lib/github-client";

type Folder = { name: string; path: string };

export default function FilesPage() {
  const [repo, setRepo] = useState<string | null>(null);
  const [listing, setListing] = useState<SharedListing | null>(null);
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const fail = useCallback((e: unknown) => {
    if (e instanceof GitHubRequestError && e.status === 401) setNeedsLogin(true);
    else setError(friendlyError(e));
  }, []);

  const refresh = useCallback(
    async (r: string) => {
      try {
        setListing(await listShared(r));
      } catch (e) {
        setListing({ files: [], markers: [] });
        fail(e);
      }
    },
    [fail],
  );

  useEffect(() => {
    const r = getCurrentRepo();
    setRepo(r);
    void refresh(r);
  }, [refresh]);

  const open = (path: string) => {
    setFolder(path);
    setNewFolder(null);
    setError(null);
    setNotice(null);
  };

  async function upload(list: FileList | File[]) {
    if (!repo) return;
    setError(null);
    setNotice(null);
    let current = listing ?? { files: [], markers: [] };
    for (const file of Array.from(list)) {
      setBusy(`Uploading ${file.name}…`);
      try {
        const saved = await uploadSharedFile(repo, file, folder, current, (done, total) => setBusy(`Uploading ${file.name}… piece ${Math.min(done + 1, total)} of ${total}`));
        current = { ...current, files: [...current.files, saved].sort((a, b) => a.path.localeCompare(b.path)) };
        setListing(current);
        setNotice(`Shared ${saved.name}.`);
      } catch (e) {
        fail(e);
        break;
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    void refresh(repo);
  }

  async function run(label: string, job: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setBusy(label);
    try {
      await job();
    } catch (e) {
      fail(e);
    }
    setBusy(null);
  }

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!repo || !listing || newFolder === null) return;
    const name = newFolder;
    void run(`Making folder ${name.trim()}…`, async () => {
      const path = await createSharedFolder(repo, folder, name, listing);
      setListing((l) => (l ? { ...l, markers: [...l.markers, sharedPath(path, FOLDER_MARKER)] } : l));
      setNewFolder(null);
      setNotice(`Made folder ${path.split("/").pop()}.`);
    });
  };

  const remove = (file: SharedFile) => {
    if (!repo || !confirm(`Remove ${file.name} from the team's files?`)) return;
    void run(`Removing ${file.name}…`, async () => {
      await deleteSharedFile(repo, file);
      setListing((l) => (l ? { ...l, files: l.files.filter((x) => x.path !== file.path) } : l));
      setNotice(`Removed ${file.name}.`);
    });
  };

  const removeFolder = (f: Folder) => {
    if (!repo || !listing) return;
    const count = listing.files.filter((x) => x.folder === f.path || x.folder.startsWith(`${f.path}/`)).length;
    const what = count === 0 ? "" : ` and the ${count} file${count === 1 ? "" : "s"} in it`;
    if (!confirm(`Remove the folder ${f.name}${what}?`)) return;
    void run(`Removing folder ${f.name}…`, async () => {
      await deleteSharedFolder(repo, f.path, listing);
      const gone = new Set(pathsInFolder(listing, f.path));
      setListing((l) => (l ? { files: l.files.filter((x) => !gone.has(x.path)), markers: l.markers.filter((m) => !gone.has(m)) } : l));
      setNotice(`Removed folder ${f.name}.`);
    });
  };

  const download = (file: SharedFile) => {
    if (repo) void run(`Downloading ${file.name}…`, () => saveSharedFile(repo, file, (done, total) => setBusy(`Downloading ${file.name}… piece ${done} of ${total}`)));
  };

  const here = listing ? folderView(listing, folder) : null;
  const deep = folder ? folder.split("/").length : 0;
  const locked = !repo || busy !== null || needsLogin;
  const TONES = ["pink", "cyan", "mustard", "green"] as const;
  const ext = (name: string) => (name.includes(".") ? (name.split(".").pop() ?? "").slice(0, 5).toUpperCase() : "FILE");
  const actions = (file: SharedFile) => (
    <div className="flex gap-2">
      <Button variant="ghost" className="bg-paper py-1.5" disabled={busy !== null} onClick={() => download(file)}>
        Download
      </Button>
      <Button variant="ghost" className="py-1.5" disabled={busy !== null || needsLogin} onClick={() => remove(file)}>
        Delete
      </Button>
    </div>
  );
  const folderDelete = (f: Folder) => (
    <button
      type="button"
      onClick={() => removeFolder(f)}
      disabled={busy !== null || needsLogin}
      aria-label={`Delete folder ${f.name}`}
      title="Delete folder"
      className="grid size-9 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
    >
      <Icon name="trash" className="size-4" />
    </button>
  );
  const empty = folder ? "This folder is empty. Upload a file or drop it here." : "No files yet. Share the first one with Upload, or drop it here.";

  return (
    <div className="max-w-6xl">
      <PageHeader title="Drive" subtitle={repo ? `Shared with everyone on ${repo}. Saved in its COCOMMIT/files folder.` : "Shared team files."}>
        <span className="hidden w-24 lg:block" aria-hidden />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="glass"
            onClick={() => setNewFolder((v) => (v === null ? "" : null))}
            disabled={locked || deep >= MAX_FOLDER_DEPTH}
            title={deep >= MAX_FOLDER_DEPTH ? `Folders go at most ${MAX_FOLDER_DEPTH} levels deep.` : undefined}
            className="flex items-center gap-2 py-3"
          >
            <Icon name="folder" className="size-4" /> New folder
          </Button>
          <Button variant="glass" onClick={() => input.current?.click()} disabled={locked} className="flex items-center gap-2 py-3">
            <Icon name="upload" className="size-4" /> Upload
          </Button>
          <div className="glass relative inline-flex gap-1 rounded-full p-1" role="group" aria-label="View">
            <span
              aria-hidden
              className="glass-thumb pointer-events-none absolute left-1 top-1 size-10 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(${view === "grid" ? 0 : "calc(100% + 0.25rem)"})` }}
            />
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                aria-label={v === "grid" ? "Grid view" : "List view"}
                className={`relative z-10 grid size-10 place-items-center rounded-full ${view === v ? "text-white" : "text-white/80 hover:text-white"}`}
              >
                <Icon name={v} className="size-4" />
              </button>
            ))}
          </div>
        </div>
        <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />
      </PageHeader>

      <nav aria-label="Folder" className="mb-4 flex flex-wrap items-center gap-1 text-sm">
        <button type="button" onClick={() => open("")} className={`rounded-full px-3 py-1.5 ${folder ? "text-white/80 hover:bg-white/10" : "glass font-medium text-white"}`}>
          All files
        </button>
        {crumbs(folder).map((c, i, all) => (
          <span key={c.path} className="flex items-center gap-1">
            <Icon name="chevron" className="size-4 -rotate-90 text-white/50" />
            <button
              type="button"
              onClick={() => open(c.path)}
              aria-current={i === all.length - 1 ? "page" : undefined}
              className={`max-w-[12rem] truncate rounded-full px-3 py-1.5 ${i === all.length - 1 ? "glass font-medium text-white" : "text-white/80 hover:bg-white/10"}`}
            >
              {c.name}
            </button>
          </span>
        ))}
      </nav>

      {newFolder !== null && (
        <form onSubmit={create} className="glass mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-3">
          <label htmlFor="new-folder" className="sr-only">
            Folder name
          </label>
          <Icon name="folder" className="ml-1 size-5 text-white/80" />
          <input
            id="new-folder"
            autoFocus
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setNewFolder(null)}
            placeholder={folder ? `New folder in ${folder.split("/").pop()}` : "New folder name"}
            maxLength={60}
            className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/50 focus:outline-none"
          />
          <Button variant="blue" type="submit" disabled={busy !== null || !newFolder.trim()} className="py-2">
            Create
          </Button>
          <Button variant="glass" type="button" onClick={() => setNewFolder(null)} className="py-2">
            Cancel
          </Button>
        </form>
      )}

      {needsLogin && (
        <Card className="mb-4">
          <p className="mb-3 text-sm text-muted">Sign in with GitHub to see and share the team's files.</p>
          <a href={signInHref("/files")} className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            Sign in with GitHub
          </a>
        </Card>
      )}

      {busy && (
        <p className="mb-3 text-sm text-muted" role="status">
          {busy}
        </p>
      )}
      {notice && <p className="mb-3 text-sm text-added">{notice}</p>}
      {error && <p className="mb-3 text-sm text-removed">{error}</p>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!needsLogin && !busy) void upload(e.dataTransfer.files);
        }}
        className={dragging ? "rounded-xl outline-2 outline-dashed outline-green" : ""}
      >
        {here === null ? (
          <Skeleton lines={4} className="max-w-md" />
        ) : view === "list" ? (
          <Card title={folder ? folder.split("/").pop() : "Team files"}>
            {here.folders.length + here.files.length === 0 ? (
              <p className="text-sm text-muted">{empty}</p>
            ) : (
              <ul className="divide-y divide-line">
                {here.folders.map((f) => (
                  <li key={f.path} className="flex items-center justify-between gap-2 py-2">
                    <button type="button" onClick={() => open(f.path)} className="flex min-w-0 flex-1 items-center gap-2 text-left hover:underline">
                      <Icon name="folder" className="size-5" />
                      <span className="truncate text-sm font-medium">{f.name}</span>
                    </button>
                    <Button variant="ghost" className="py-1.5" disabled={busy !== null || needsLogin} onClick={() => removeFolder(f)}>
                      Delete
                    </Button>
                  </li>
                ))}
                {here.files.map((file) => (
                  <li key={file.path} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon name="file" className="size-5" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted">{formatSize(file.size)}</p>
                      </div>
                    </div>
                    {actions(file)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <>
            {here.folders.length > 0 && (
              <ul className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Folders">
                {here.folders.map((f) => (
                  <li key={f.path} className="glass flex items-center gap-1 rounded-2xl p-1.5 pr-2">
                    <button type="button" onClick={() => open(f.path)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3 text-left text-white hover:bg-white/10">
                      <Icon name="folder" className="size-6" />
                      <span className="truncate font-medium" title={f.name}>
                        {f.name}
                      </span>
                    </button>
                    {folderDelete(f)}
                  </li>
                ))}
              </ul>
            )}
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {here.files.map((file, i) => (
                <li key={file.path} style={{ "--d": `${i * 60}ms` } as React.CSSProperties} className={`rise lift block-${TONES[i % TONES.length]} flex min-h-[15rem] flex-col justify-between p-5 lg:min-h-[25rem]`}>
                  <div className="flex items-start justify-between gap-2">
                    <Icon name="file" className="size-7" />
                    <span className="rounded-full border border-black bg-paper px-2.5 py-0.5 text-xs font-medium">{ext(file.name)}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs">{formatSize(file.size)}</p>
                    </div>
                    {actions(file)}
                  </div>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  disabled={locked}
                  className="flex min-h-[15rem] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/40 p-5 text-center lg:min-h-[25rem] text-sm hover:bg-white/5 disabled:opacity-50"
                >
                  <Icon name="plus" className="size-6" />
                  <span className="font-medium">{folder ? `Upload to ${folder.split("/").pop()}` : "Upload a file"}</span>
                  <span className="text-xs text-muted">or drop files here, up to {formatSize(MAX_FILE_BYTES)} each</span>
                </button>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
