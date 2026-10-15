"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { me, messages as initial, online, repos, type ChatMessage } from "@/lib/mock";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup function.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), repo: repos[0].fullName, author: me, text, kind: "text", pinned: false, createdAt: new Date().toISOString() },
    ]);
    setText("");
  };

  const togglePin = (id: string) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)));

  return (
    <div className="flex h-[calc(100dvh-4rem)] max-w-5xl flex-col">
      <PageHeader title="Chat" subtitle={`# ${repos[0].fullName}`} />
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
                    <button onClick={() => togglePin(m.id)} className="ml-2 opacity-0 group-hover:opacity-100 focus:opacity-100">
                      {m.pinned ? "Unpin" : "Pin"}
                    </button>
                  </p>
                  <p className="text-sm">{m.text}</p>
                </div>
              ),
            )}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="mt-3 flex gap-2">
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
