"use client";

import Link from "next/link";
import { useState } from "react";
import { useAssistant } from "@/components/Assistant";
import { problem, useRepo, useWorkspace } from "@/components/home/data";
import { Icon } from "@/components/icons";
import { SetupForm } from "@/components/SetupForm";
import { TeamSpines } from "@/components/TeamSpines";
import { Button, Card, PageHeader, Pill, Skeleton, Tabs } from "@/components/ui";
import { FILES } from "@/lib/context";
import { signInHref } from "@/lib/github-client";
import type { Workspace } from "@/lib/workspace";

const TABS = [
  { id: "instructions", label: "Instructions" },
  { id: "handoff", label: "Handoff" },
  { id: "team", label: "Team" },
  { id: "decisions", label: "Decisions" },
  { id: "gotchas", label: "Gotchas" },
  { id: "log", label: "Log" },
  { id: "todo", label: "To-do" },
  { id: "board", label: "Board" },
];

// Agent Context (Figma "Context · …"): the team's COCOMMIT/ files, one tab each. Read-only here; "Open on GitHub"
// links to the file to change it (the save helpers in src/lib/workspace.ts are ready for a form).
export default function ContextPage() {
  const repo = useRepo();
  const [rev, setRev] = useState(0);
  const ws = useWorkspace(repo, rev);
  const assistant = useAssistant();
  const [tab, setTab] = useState("instructions");

  const trouble = problem(ws);
  const data = ws.status === "ready" ? ws.data : null;
  const file = (key: keyof typeof FILES) => `https://github.com/${repo}/blob/HEAD/${FILES[key]}`;

  return (
    <div className="max-w-6xl">
      <PageHeader title="Agent Context" subtitle={repo ? `The team files in ${repo}/COCOMMIT that every teammate's AI agent reads first.` : undefined}>
        <span className="hidden w-24 lg:block" aria-hidden />
        <Button variant="glass" onClick={() => assistant.setSize("open")} className="flex items-center gap-2 py-3">
          <Icon name="sparkle" className="size-4" /> Ask assistant
        </Button>
      </PageHeader>

      <Tabs label="Context files" value={tab} onChange={setTab} tabs={TABS} className="mb-5" />

      {ws.status === "loading" && <Card className="max-w-2xl"><Skeleton lines={5} /></Card>}
      {trouble && (
        <Card className="max-w-xl">
          <p className="text-sm">
            {trouble}{" "}
            {ws.status === "login" && (
              <Link href={signInHref("/context")} className="font-medium underline">
                Log in
              </Link>
            )}
          </p>
        </Card>
      )}
      {ws.status === "ready" && !data && repo && (
        <Card tone="pink" className="max-w-2xl" title="Set up team context">
          <SetupForm repo={repo} onDone={() => setRev((r) => r + 1)} />
        </Card>
      )}
      {data && <Tab tab={tab} data={data} file={file} />}
    </div>
  );
}

function OpenLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-block text-sm font-medium underline">
      {label} ↗
    </a>
  );
}

function Tab({ tab, data, file }: { tab: string; data: Workspace; file: (key: keyof typeof FILES) => string }) {
  if (tab === "instructions")
    return (
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <Card tone="pink" title="Instructions">
          <p className="-mt-9 mb-3 text-right text-xs">Shown to the assistant</p>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-black bg-paper p-4 font-sans text-sm">{data.files.context}</pre>
          <div className="mt-3">
            <OpenLink href={file("context")} label="Open CONTEXT.md on GitHub" />
          </div>
        </Card>
        <Card tone="green" title="Team files">
          <ul className="space-y-2">
            {(Object.keys(FILES) as (keyof typeof FILES)[]).map((k) => (
              <li key={k} className="flex items-center justify-between gap-2 rounded-xl border border-black bg-paper px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{FILES[k].split("/").pop()}</span>
                {data.files[k] === null ? <Pill>missing</Pill> : (
                  <a href={file(k)} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-medium underline">
                    open ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );

  if (tab === "handoff") {
    const h = data.handoff;
    return (
      <Card tone="pink" className="max-w-3xl" title="Handoff">
        <p className="mb-4 text-sm">{h.updated || h.by ? `Updated ${h.updated || "?"} by ${h.by || "?"}` : "Nothing written yet."}</p>
        <div className="space-y-3">
          <div className="rounded-xl border border-black bg-paper p-4">
            <h3 className="text-sm font-semibold">Current state</h3>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{h.state || "—"}</p>
          </div>
          <div className="rounded-xl border border-black bg-paper p-4">
            <h3 className="text-sm font-semibold">Next step</h3>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{h.next || "—"}</p>
          </div>
        </div>
        <div className="mt-3">
          <OpenLink href={file("handoff")} label="Open HANDOFF.md on GitHub" />
        </div>
      </Card>
    );
  }

  if (tab === "team")
    return (
      <div className="max-w-4xl space-y-4">
        {data.collab.length === 0 && <Card><p className="text-sm">Nobody is listed in COLLAB.md yet.</p></Card>}
        <TeamSpines members={data.collab} />
        <OpenLink href={file("collab")} label="Open COLLAB.md on GitHub" />
      </div>
    );

  if (tab === "decisions" || tab === "gotchas") {
    const items = tab === "decisions" ? data.decisions : data.gotchas;
    const key = tab === "decisions" ? "decisions" : "gotchas";
    return (
      <Card tone={tab === "decisions" ? "mustard" : "clay"} className="max-w-3xl">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          {tab === "decisions" ? "Decisions" : "Gotchas"} <Pill>{items.length}</Pill>
        </h2>
        {items.length === 0 ? (
          <p className="text-sm">None yet. Pin a chat message as a {tab === "decisions" ? "decision" : "gotcha"} to add one.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((t, i) => (
              <li key={`${t}-${i}`} className="rounded-xl border border-black bg-paper px-4 py-2.5 text-sm font-medium">
                {t}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <OpenLink href={file(key)} label={`Open ${FILES[key].split("/").pop()} on GitHub`} />
        </div>
      </Card>
    );
  }

  if (tab === "log")
    return (
      <Card className="max-w-3xl" title="Log">
        {data.log.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-2 font-mono text-xs">
            {data.log.slice(0, 30).map((l, i) => (
              <li key={i} className="break-words border-b border-black/15 pb-2 last:border-0">
                {l.replace(/^- /, "")}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <OpenLink href={file("log")} label="Open LOG.md on GitHub" />
        </div>
      </Card>
    );

  if (tab === "todo")
    return (
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card tone="cyan" title="Backlog">
          {data.todo.backlog.length === 0 ? (
            <p className="text-sm">Nothing in the backlog.</p>
          ) : (
            <ul className="space-y-2">
              {data.todo.backlog.map((t, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-black bg-paper px-4 py-2.5 text-sm">
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-black ${t.done ? "bg-black text-white" : "bg-paper"}`} aria-hidden>
                    {t.done && <Icon name="check" className="size-3" />}
                  </span>
                  <span className={t.done ? "line-through opacity-70" : ""}>{t.text}</span>
                  <span className="sr-only">{t.done ? "(done)" : "(open)"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card tone="green" title="Open questions">
          {data.todo.questions.length === 0 ? (
            <p className="text-sm">No open questions.</p>
          ) : (
            <ul className="space-y-2">
              {data.todo.questions.map((q, i) => (
                <li key={i} className="rounded-xl border border-black bg-paper px-4 py-2.5 text-sm">
                  {q}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <OpenLink href={file("todo")} label="Open TODO.md on GitHub" />
          </div>
        </Card>
      </div>
    );

  return (
    <Card tone="mustard" className="max-w-xl" title="Board">
      <p className="mb-4 text-sm">The task board lives with the team: Pending, Doing and Done, one commit per move.</p>
      <Link href="/tasks" className="inline-block rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90">
        Open the Team board
      </Link>
    </Card>
  );
}
