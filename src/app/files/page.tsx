"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { getCurrentRepo } from "@/lib/current-repo";
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
  const input = useRef<HTMLInputElement>(null);

  const fail = useCallback((e: unknown) => {
    if (e instanceof GitHubRequestError && e.status === 401) setNeedsLogin(true);
    else setError(e instanceof Error ? e.message : "Something went wrong.");
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

  return (
    <div className="max-w-3xl">
      <PageHeader title="Files" subtitle={repo ? `Shared with everyone on ${repo}. Saved in its COCOMMIT/files folder.` : "Shared team files."}>
        <Button onClick={() => input.current?.click()} disabled={!repo || busy !== null || needsLogin}>
          Choose files
        </Button>
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
        className={`mb-4 rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted ${dragging ? "border-accent bg-line/40" : "border-line"}`}
      >
        Drop files here, up to {formatSize(MAX_FILE_BYTES)} each.
      </div>

      {busy && <p className="mb-3 text-sm text-muted">{busy}</p>}
      {notice && <p className="mb-3 text-sm text-added">{notice}</p>}
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <Card title="Team files">
        {files === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted">No files yet. Share the first one above.</p>
        ) : (
          <ul className="divide-y divide-line">
            {files.map((file) => (
              <li key={file.path} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted">{formatSize(file.size)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" disabled={busy !== null} onClick={() => repo && void run(`Downloading ${file.name}…`, () => saveSharedFile(repo, file))}>
                    Download
                  </Button>
                  <Button variant="ghost" disabled={busy !== null || needsLogin} onClick={() => remove(file)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
