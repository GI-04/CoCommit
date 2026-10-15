"use client";

import { useMemo, useState } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { contextFile, messages } from "@/lib/mock";

type Section = { heading: string; body: string };

// Temporary parser; the real one moves to src/lib/context.ts (AI context task).
function parse(md: string): Section[] {
  return md
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const [heading, ...rest] = chunk.split("\n");
      return { heading: heading.trim(), body: rest.join("\n").trim() };
    });
}

export default function ContextPage() {
  const [sections, setSections] = useState<Section[]>(() => parse(contextFile));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const pinned = useMemo(() => messages.filter((m) => m.pinned || m.kind === "git_event"), []);

  const startEdit = (s: Section) => {
    setEditing(s.heading);
    setDraft(s.body);
  };

  const save = () => {
    setSections((all) => all.map((s) => (s.heading === editing ? { ...s, body: draft } : s)));
    setSaved(`Saved “${editing}” to COCOMMIT.md (fake commit for now)`);
    setEditing(null);
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Context" subtitle="COCOMMIT.md: the one file every teammate's AI agent reads first." />
      {saved && <p className="mb-4 rounded-md border border-added/40 bg-added/10 px-3 py-2 text-sm">{saved}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          {sections.map((s) => (
            <Card key={s.heading}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">{s.heading}</h2>
                {editing !== s.heading && (
                  <Button variant="ghost" onClick={() => startEdit(s)}>
                    Edit
                  </Button>
                )}
              </div>
              {editing === s.heading ? (
                <>
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} className="w-full rounded-md border border-line bg-bg p-2 font-mono text-sm" />
                  <div className="mt-2 flex gap-2">
                    <Button onClick={save}>Save</Button>
                    <Button variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <p className="whitespace-pre-wrap text-sm">{s.body}</p>
              )}
            </Card>
          ))}
        </div>
        <Card title="Recent activity (auto-added)">
          <ul className="space-y-2 text-sm">
            {pinned.map((m) => (
              <li key={m.id}>
                <span className="font-medium">{m.author}:</span> <span className="text-muted">{m.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
