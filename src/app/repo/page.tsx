"use client";

import { useState } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { branches, changes, repos, type Change } from "@/lib/mock";

const badge: Record<Change["status"], string> = {
  added: "text-added",
  modified: "text-accent",
  deleted: "text-removed",
};

export default function RepoPage() {
  const [repo, setRepo] = useState(repos[0].fullName);
  const [branch, setBranch] = useState(branches[1]);
  const [selected, setSelected] = useState<Set<string>>(new Set(changes.map((c) => c.path)));
  const [open, setOpen] = useState(changes[0].path);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const toggle = (path: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const commit = () => {
    setStatus(`Committed ${selected.size} file(s) to ${branch}: “${message}” (fake for now)`);
    setMessage("");
  };

  const openPr = () => setStatus(`Opened a pull request: ${branch} → main (fake for now)`);

  const diff = changes.find((c) => c.path === open);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Repo" subtitle="Pick what to save, write a message, press Commit.">
        <div className="flex gap-2">
          <select value={repo} onChange={(e) => setRepo(e.target.value)} className="rounded-md border border-line bg-surface px-2 py-2 text-sm">
            {repos.map((r) => (
              <option key={r.fullName}>{r.fullName}</option>
            ))}
          </select>
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-md border border-line bg-surface px-2 py-2 text-sm">
            {branches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
      </PageHeader>

      {status && <p className="mb-4 rounded-md border border-added/40 bg-added/10 px-3 py-2 text-sm">{status}</p>}

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card title={`Changed files (${changes.length})`}>
          <ul className="space-y-1">
            {changes.map((c) => (
              <li key={c.path} className={`flex items-center gap-2 rounded px-1 ${open === c.path ? "bg-line/60" : ""}`}>
                <input type="checkbox" checked={selected.has(c.path)} onChange={() => toggle(c.path)} aria-label={`Include ${c.path}`} />
                <button onClick={() => setOpen(c.path)} className="min-w-0 flex-1 truncate py-1 text-left text-sm">
                  {c.path}
                </button>
                <span className={`text-xs ${badge[c.status]}`}>{c.status[0].toUpperCase()}</span>
              </li>
            ))}
          </ul>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What did you change?"
            rows={3}
            className="mt-4 w-full rounded-md border border-line bg-bg p-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={commit} disabled={!message.trim() || selected.size === 0} className="flex-1">
              Commit
            </Button>
            <Button variant="ghost" onClick={openPr}>
              Open PR
            </Button>
          </div>
        </Card>

        <Card title={diff ? `${diff.path}  +${diff.additions} −${diff.deletions}` : "Changes"}>
          <pre className="overflow-x-auto text-sm leading-6">
            {diff?.patch.split("\n").map((line, i) => (
              <div
                key={i}
                className={line.startsWith("+") ? "bg-added/10 text-added" : line.startsWith("-") ? "bg-removed/10 text-removed" : line.startsWith("@@") ? "text-muted" : ""}
              >
                {line || " "}
              </div>
            ))}
          </pre>
        </Card>
      </div>
    </div>
  );
}
