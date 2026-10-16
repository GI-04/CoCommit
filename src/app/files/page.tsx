"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Button, Card, PageHeader, Skeleton } from "@/components/ui";
import { getCurrentRepo } from "@/lib/current-repo";
import { friendlyError } from "@/lib/errors";
import { deleteSharedFile, listShared, saveSharedFile, uploadSharedFile, type SharedFile } from "@/lib/files";
import { formatSize, MAX_FILE_BYTES } from "@/lib/files-util";
import { GitHubRequestError, signInHref } from "@/lib/github-client";

export default function FilesPage() {
  const [repo, setRepo] = useState<string | null>(null);
  const [files, setFiles] = useState<SharedFile[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const input = useRef<HTMLInputElement>(null);

  const fail = useCallback((e: unknown) => {
    if (e instanceof GitHubRequestError && e.status === 401) setNeedsLogin(true);
    else setError(friendlyError(e));
  }, []);

  const refresh = useCallback(
    async (r: string) => {
      try {
        setFiles(await listShared(r));
      } catch (e) {
        setFiles([]);
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

  async function upload(list: FileList | File[]) {
    if (!repo) return;
    setError(null);
    setNotice(null);
    let current = files ?? [];
    for (const file of Array.from(list)) {
      setBusy(`Uploading ${file.name}…`);
      try {
        const saved = await uploadSharedFile(repo, file, current);
        current = [...current, saved].sort((a, b) => a.name.localeCompare(b.name));
        setFiles(current);
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

  const remove = (file: SharedFile) => {
    if (!repo || !confirm(`Remove ${file.name} from the team's files?`)) return;
    void run(`Removing ${file.name}…`, async () => {
      await deleteSharedFile(repo, file);
      setFiles((f) => (f ?? []).filter((x) => x.path !== file.path));
      setNotice(`Removed ${file.name}.`);
    });
  };

  const TONES = ["pink", "cyan", "mustard", "green"] as const;
  const ext = (name: string) => (name.includes(".") ? (name.split(".").pop() ?? "").slice(0, 5).toUpperCase() : "FILE");
  const actions = (file: SharedFile) => (
    <div className="flex gap-2">
      <Button variant="ghost" className="bg-paper py-1.5" disabled={busy !== null} onClick={() => repo && void run(`Downloading ${file.name}…`, () => saveSharedFile(repo, file))}>
        Download
      </Button>
      <Button variant="ghost" className="py-1.5" disabled={busy !== null || needsLogin} onClick={() => remove(file)}>
        Delete
      </Button>
    </div>
  );

  return (
    <div className="max-w-6xl">
      <PageHeader title="Drive" subtitle={repo ? `Shared with everyone on ${repo}. Saved in its COCOMMIT/files folder.` : "Shared team files."}>
        <span className="hidden w-24 lg:block" aria-hidden />
        <div className="flex items-center gap-3">
          <Button variant="glass" onClick={() => input.current?.click()} disabled={!repo || busy !== null || needsLogin} className="flex items-center gap-2 py-3">
            <Icon name="upload" className="size-4" /> Upload
          </Button>
          <div className="glass inline-flex gap-1 rounded-full p-1" role="group" aria-label="View">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                aria-label={v === "grid" ? "Grid view" : "List view"}
                className={`grid size-10 place-items-center rounded-full ${view === v ? "glass-thumb text-white" : "text-white/80 hover:bg-white/10"}`}
              >
                <Icon name={v} className="size-4" />
              </button>
            ))}
          </div>
        </div>
        <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />
      </PageHeader>

      {needsLogin && (
        <Card className="mb-4">
          <p className="mb-3 text-sm text-muted">Sign in with GitHub to see and share the team's files.</p>
          <a href={signInHref("/files")} className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            Sign in with GitHub
          </a>
        </Card>
      )}

      {busy && <p className="mb-3 text-sm text-muted">{busy}</p>}
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
        {files === null ? (
          <Skeleton lines={4} className="max-w-md" />
        ) : view === "list" ? (
          <Card title="Team files">
            {files.length === 0 ? (
              <p className="text-sm text-muted">No files yet. Share the first one with Upload, or drop it here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {files.map((file) => (
                  <li key={file.path} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted">{formatSize(file.size)}</p>
                    </div>
                    {actions(file)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {files.map((file, i) => (
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
                disabled={!repo || busy !== null || needsLogin}
                className="flex min-h-[15rem] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/40 p-5 text-center text-sm hover:bg-white/5 disabled:opacity-50 lg:min-h-[25rem]"
              >
                <Icon name="plus" className="size-6" />
                <span className="font-medium">Upload a file</span>
                <span className="text-xs text-muted">or drop files here, up to {formatSize(MAX_FILE_BYTES)} each</span>
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
