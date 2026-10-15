"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import {
  chatFake,
  loadMessages,
  mergeMessage,
  myName,
  onlineUsers,
  pinMessage,
  sendMessage,
  setMyName,
  subscribe,
  type ChatMessage,
} from "@/lib/chat";
import {
  decisionFields,
  gotchaFields,
  NoWorkspaceError,
  saveAsDecision,
  saveAsGotcha,
  type DecisionFields,
  type GotchaFields,
} from "@/lib/chat-pins";
import { GitHubRequestError, signInHref } from "@/lib/github-client";
import { repos } from "@/lib/mock";

// The "Pin as decision / gotcha" form open under one message.
type PinForm = { id: string; kind: "decision"; fields: DecisionFields } | { id: string; kind: "gotcha"; fields: GotchaFields };
type PinNote = { ok: boolean; text: string; href?: string };
const input = "w-full rounded-md border border-line bg-bg px-2 py-1 text-sm";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// The team's repo for now; sharing the picked repo with the Repo screen is a later step.
const repo = repos[0].fullName;

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null); // non-null while editing
  const [pinForm, setPinForm] = useState<PinForm | null>(null);
  const [pinNote, setPinNote] = useState<PinNote | null>(null);
  const [saving, setSaving] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  // Load the history, then keep listening for new messages and pin changes.
  useEffect(() => {
    myName().then(setName);
    loadMessages(repo)
      .then((list) => setMessages((now) => list.reduce(mergeMessage, now)))
      .catch((e: Error) => setError(e.message));
    return subscribe(repo, (m) => setMessages((now) => mergeMessage(now, m)));
  }, []);

  // Who's online; joins again under the new name after a rename.
  useEffect(() => (name ? onlineUsers(repo, setOnline) : undefined), [name]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setName(await setMyName(nameDraft));
    setNameDraft(null);
  };

  // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup function.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const draft = text;
    setText("");
    try {
      const m = await sendMessage(repo, draft);
      setMessages((now) => mergeMessage(now, m));
      setError(null);
    } catch (err) {
      setText(draft);
      setError(err instanceof Error ? err.message : "Couldn't send the message.");
    }
  };

  const setField = (key: string, value: string) =>
    setPinForm((f) => (f ? ({ ...f, fields: { ...f.fields, [key]: value } } as PinForm) : f));

  const savePin = async (e: React.FormEvent, m: ChatMessage) => {
    e.preventDefault();
    if (!pinForm) return;
    setSaving(true);
    try {
      const commit =
        pinForm.kind === "decision" ? await saveAsDecision(repo, m, pinForm.fields) : await saveAsGotcha(repo, m, pinForm.fields);
      const file = pinForm.kind === "decision" ? "DECISIONS.md" : "GOTCHAS.md";
      setPinNote(commit ? { ok: true, text: `Saved to COCOMMIT/${file}.`, href: commit.url } : { ok: true, text: `Already in ${file}.` });
      setMessages((now) => mergeMessage(now, { ...m, pinned: true }));
      setPinForm(null);
    } catch (err) {
      if (err instanceof GitHubRequestError && err.status === 401) {
        setPinNote({ ok: false, text: "Log in with GitHub to save to the repo.", href: signInHref("/chat") });
      } else {
        setPinNote({ ok: false, text: err instanceof NoWorkspaceError || err instanceof Error ? err.message : "Couldn't save." });
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (m: ChatMessage) => {
    setMessages((now) => mergeMessage(now, { ...m, pinned: !m.pinned }));
    try {
      await pinMessage(m.id, !m.pinned);
    } catch (err) {
      setMessages((now) => mergeMessage(now, m));
      setError(err instanceof Error ? err.message : "Couldn't pin the message.");
    }
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] max-w-5xl flex-col">
      <PageHeader title="Chat" subtitle={`# ${repo}${chatFake ? " · demo mode: messages stay in this browser" : ""}`} />
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_12rem]">
        <Card className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((m) =>
              m.kind === "git_event" ? (
                <p key={m.id} className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-muted">
                  <span className="font-medium text-fg">{m.author}</span> {m.text} · <time suppressHydrationWarning>{time(m.createdAt)}</time>
                </p>
              ) : (
                <div key={m.id} className="group">
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-fg">{m.author}</span> · <time suppressHydrationWarning>{time(m.createdAt)}</time>
                    {m.pinned && " · 📌 pinned"}
                    <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                      <button onClick={() => togglePin(m)} className="ml-2">
                        {m.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button onClick={() => setPinForm({ id: m.id, kind: "decision", fields: decisionFields(m) })} className="ml-2">
                        Decision
                      </button>
                      <button onClick={() => setPinForm({ id: m.id, kind: "gotcha", fields: gotchaFields(m) })} className="ml-2">
                        Gotcha
                      </button>
                    </span>
                  </p>
                  <p className="text-sm">{m.text}</p>
                  {pinForm?.id === m.id && (
                    <form onSubmit={(e) => savePin(e, m)} className="mt-2 space-y-2 rounded-md border border-line bg-bg p-3 text-xs">
                      <p className="font-medium text-fg">
                        {pinForm.kind === "decision" ? "Save as a decision (COCOMMIT/DECISIONS.md)" : "Save as a gotcha (COCOMMIT/GOTCHAS.md)"}
                      </p>
                      <input value={pinForm.fields.title} onChange={(e) => setField("title", e.target.value)} placeholder="Title" className={input} />
                      {pinForm.kind === "decision" ? (
                        <>
                          <textarea value={pinForm.fields.decision} onChange={(e) => setField("decision", e.target.value)} placeholder="Decision" rows={2} className={input} />
                          <input value={pinForm.fields.why} onChange={(e) => setField("why", e.target.value)} placeholder="Why?" className={input} />
                          <input value={pinForm.fields.alternatives} onChange={(e) => setField("alternatives", e.target.value)} placeholder="Alternatives (optional)" className={input} />
                        </>
                      ) : (
                        <>
                          <textarea value={pinForm.fields.whatFailed} onChange={(e) => setField("whatFailed", e.target.value)} placeholder="What failed" rows={2} className={input} />
                          <input value={pinForm.fields.workaround} onChange={(e) => setField("workaround", e.target.value)} placeholder="Workaround" className={input} />
                        </>
                      )}
                      <div className="flex gap-2">
                        <Button type="submit" disabled={saving}>
                          {saving ? "Saving…" : "Save"}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setPinForm(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              ),
            )}
            <div ref={end} />
          </div>
          {error && <p className="mt-2 text-sm text-removed">{error}</p>}
          {pinNote && (
            <p className={`mt-2 text-sm ${pinNote.ok ? "text-added" : "text-removed"}`}>
              {pinNote.text}{" "}
              {pinNote.href && (
                <a href={pinNote.href} target={pinNote.ok ? "_blank" : undefined} rel="noreferrer" className="underline">
                  {pinNote.ok ? "View on GitHub" : "Log in with GitHub"}
                </a>
              )}
              <button onClick={() => setPinNote(null)} className="ml-2 text-xs text-muted" aria-label="Dismiss">
                ✕
              </button>
            </p>
          )}
          {nameDraft === null ? (
            <p className="mt-3 text-xs text-muted">
              You: <span className="font-medium text-fg">{name ?? "…"}</span>
              <button onClick={() => setNameDraft(name ?? "")} className="ml-2 underline">
                Change name
              </button>
            </p>
          ) : (
            <form onSubmit={saveName} className="mt-3 flex gap-2 text-xs">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Your name (empty = automatic)"
                maxLength={40}
                autoFocus
                className="min-w-0 flex-1 rounded-md border border-line bg-bg px-2 py-1"
              />
              <Button type="submit">Save</Button>
              <Button type="button" variant="ghost" onClick={() => setNameDraft(null)}>
                Cancel
              </Button>
            </form>
          )}
          <form onSubmit={send} className="mt-2 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message the team"
              className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={!text.trim()}>
              Send
            </Button>
          </form>
        </Card>
        <Card title={`Online (${online.length})`} className="hidden lg:block">
          <ul className="space-y-2 text-sm">
            {online.map((u) => (
              <li key={u} className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-added" /> {u}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
