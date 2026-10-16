"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { canPost, loadMessages, mergeMessage, sendMessage, subscribe, type ChatMessage } from "@/lib/chat";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// The repo's CoCommit chat beside a call, in place of LiveKit's built-in chat: messages are saved and show up
// in /chat, and git events show up here. Pinning, decisions and @cocommit stay on the full /chat page.
export default function CallChat({ repo }: { repo: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mayPost, setMayPost] = useState<boolean | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    canPost().then(setMayPost).catch(() => setMayPost(false));
    loadMessages(repo, 50)
      .then((all) => setMessages((now) => all.reduce(mergeMessage, now)))
      .catch((e: Error) => setError(e.message));
    return subscribe(repo, (m) => setMessages((now) => mergeMessage(now, m)));
  }, [repo]);

  // Scroll the message list only (scrollIntoView would also scroll the page under the call).
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const draft = text.trim();
    if (!draft) return;
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

  return (
    <aside className="flex min-h-0 w-full flex-col rounded-lg border border-line bg-surface p-3">
      <h2 className="mb-2 text-sm font-semibold text-muted">
        Team chat <Link href="/chat" className="ml-1 font-normal underline">open full chat</Link>
      </h2>
      <div ref={list} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
        {messages.length === 0 && <p className="text-muted">No messages yet.</p>}
        {messages.map((m) =>
          m.kind === "git_event" ? (
            <p key={m.id} className="rounded-md border border-line bg-bg px-2 py-1 text-xs text-muted">
              <span className="font-medium text-fg">{m.author}</span> {m.text}
            </p>
          ) : (
            <div key={m.id}>
              <p className="text-xs text-muted">
                <span className="font-semibold text-fg">{m.author}</span> · <time suppressHydrationWarning>{time(m.createdAt)}</time>
              </p>
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
            </div>
          ),
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <form onSubmit={send} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mayPost === false ? "Log in to chat" : "Message the team"}
          disabled={mayPost === false}
          className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2.5 text-sm"
        />
        <Button type="submit" disabled={!text.trim() || mayPost === false}>
          Send
        </Button>
      </form>
    </aside>
  );
}
