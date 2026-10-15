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
import { repos } from "@/lib/mock";

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
                    <button onClick={() => togglePin(m)} className="ml-2 opacity-0 group-hover:opacity-100 focus:opacity-100">
                      {m.pinned ? "Unpin" : "Pin"}
                    </button>
                  </p>
                  <p className="text-sm">{m.text}</p>
                </div>
              ),
            )}
            <div ref={end} />
          </div>
          {error && <p className="mt-2 text-sm text-removed">{error}</p>}
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
