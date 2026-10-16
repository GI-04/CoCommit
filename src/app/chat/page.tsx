"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Initials } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { ListPanel, repoItem, type ListItem } from "@/components/ListPanel";
import { MessagesShell } from "@/components/MessagesShell";
import { Button, Card } from "@/components/ui";
import { useRepos } from "@/components/useRepos";
import { isBotMessage, shareText, stripTrigger, type BotAnswer } from "@/lib/bot";
import { askBot, BotRequestError } from "@/lib/bot-client";
import {
  canPost,
  chatFake,
  LOGIN_TO_CHAT,
  loadMessages,
  mergeMessage,
  myName,
  onlineUsers,
  pinMessage,
  sendMessage,
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
import { DEFAULT_REPO, GENERAL, getCurrentRepo, setCurrentRepo } from "@/lib/current-repo";
import { GitHubRequestError, signInHref } from "@/lib/github-client";

// The "Pin as decision / gotcha" form open under one message.
type PinForm = { id: string; kind: "decision"; fields: DecisionFields } | { id: string; kind: "gotcha"; fields: GotchaFields };
type PinNote = { ok: boolean; text: string; href?: string };
// A @cocommit question and its answer. Only the asker sees these (they aren't saved) until "Share to chat".
type BotReply = { id: string; question: string; result?: BotAnswer; error?: string; needsLogin?: boolean; shared?: boolean };
const input = "w-full rounded-md border border-line bg-bg px-2 py-1 text-sm";
const pinBtn = "ml-1.5 rounded-full bg-black px-2.5 py-0.5 text-xs text-white hover:opacity-80";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });


export default function ChatPage() {
  // Two chats: #general (the whole team) and the repo picked on /repo. `chat` is the open one (messages.repo).
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [chat, setChat] = useState(DEFAULT_REPO);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [mayPost, setMayPost] = useState<boolean | null>(null); // null while checking
  const [pinForm, setPinForm] = useState<PinForm | null>(null);
  const [pinNote, setPinNote] = useState<PinNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [botReplies, setBotReplies] = useState<BotReply[]>([]);
  const end = useRef<HTMLDivElement>(null);

  // Once: who you are, whether you can post, and the repo picked on /repo (read here, not during render,
  // so the server and browser render the same first frame).
  useEffect(() => {
    myName().then(setName);
    canPost().then(setMayPost).catch(() => setMayPost(false));
    const picked = getCurrentRepo();
    setRepo(picked);
    setChat(picked);
  }, []);

  // The open chat's history, then live updates. Switching chats starts from an empty list, and a late
  // answer for the previous chat is ignored. Signed out (or still checking): nothing loads, the page shows a login card.
  useEffect(() => {
    if (!mayPost) return;
    let current = true;
    setMessages([]);
    setPinForm(null);
    setPinNote(null);
    loadMessages(chat)
      .then((list) => current && setMessages((now) => list.reduce(mergeMessage, now)))
      .catch((e: Error) => current && setError(e.message));
    const stop = subscribe(chat, (m) => current && setMessages((now) => mergeMessage(now, m)));
    return () => {
      current = false;
      stop();
    };
  }, [chat, mayPost]);

  // Who's online in the open chat, under your account name (members only).
  useEffect(() => (name && mayPost ? onlineUsers(chat, setOnline) : undefined), [name, chat, mayPost]);

  // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup function.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botReplies]);

  const updateReply = (id: string, change: Partial<BotReply>) =>
    setBotReplies((now) => now.map((r) => (r.id === id ? { ...r, ...change } : r)));

  // "@cocommit …" goes to the bot instead of the chat. Recent chat goes along for "summarize the chat".
  const ask = async (question: string) => {
    const id = crypto.randomUUID();
    setBotReplies((now) => [...now, { id, question }]);
    const recent = messages.filter((m) => m.kind === "text").map(({ author, text, createdAt }) => ({ author, text, createdAt }));
    try {
      // The bot reads a repo's COCOMMIT/ files: the picked repo, also from #general.
      updateReply(id, { result: await askBot(repo, question, recent) });
    } catch (err) {
      updateReply(id, {
        error: err instanceof Error ? err.message : "The bot couldn't answer.",
        needsLogin: err instanceof BotRequestError && err.status === 401,
      });
    }
  };

  const shareReply = async (r: BotReply) => {
    if (!r.result) return;
    try {
      const m = await sendMessage(chat, shareText(r.question, r.result));
      setMessages((now) => mergeMessage(now, m));
      updateReply(r.id, { shared: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't share the answer.");
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const draft = text;
    setText("");
    if (isBotMessage(draft)) {
      const question = stripTrigger(draft);
      if (question) ask(question);
      else setError("Write a question after @cocommit, e.g. “@cocommit team status”.");
      return;
    }
    try {
      const m = await sendMessage(chat, draft);
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

  // The chats on the left: #general, the picked repo, then the rest of the person's repos (each repo is its own live chat).
  const { repos: myRepos, fake: demoRepos } = useRepos();
  const chats: ListItem[] = [
    { id: GENERAL, title: "# general", sub: "The whole team", short: "#" },
    ...[repo, ...myRepos.map((r) => r.fullName).filter((n) => n !== repo)].slice(0, 12).map(repoItem),
  ];
  const openChat = (id: string) => {
    if (id !== GENERAL) {
      setRepo(id);
      if (!demoRepos) setCurrentRepo(id);
    }
    setChat(id);
  };
  const current = chats.find((c) => c.id === chat) ?? chats[0];

  return (
    <MessagesShell active="chat" fill>
      <div className="grid h-full min-h-0 gap-4 max-lg:grid-cols-[minmax(0,1fr)] max-lg:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <ListPanel title="Messages" items={chats} value={chat} onSelect={openChat} />
        <Card className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-3 flex items-center gap-3 border-b border-black/15 pb-3">
            <Initials text={current.short} className="size-11 text-sm" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold">{chat === GENERAL ? "# general" : chat}</h2>
              <p className="truncate text-xs text-muted">{chat === GENERAL ? "The whole team" : "Chat for this repo"}{chatFake ? " · demo mode: messages stay in this browser" : ""}</p>
            </div>
            <p className="flex shrink-0 items-center gap-1.5 text-xs" title={online.join(", ")}>
              <span className="size-2.5 rounded-full border border-black bg-green" /> {online.length} online
            </p>
            <Link href="/files" aria-label="Open Drive" className="hidden size-10 place-items-center rounded-full border border-black hover:bg-black/10 sm:grid">
              <Icon name="folder" className="size-4" />
            </Link>
            <Link href="/calls" aria-label="Start a call" className="hidden size-10 place-items-center rounded-full border border-black hover:bg-black/10 sm:grid">
              <Icon name="phone" className="size-4" />
            </Link>
          </div>
          {mayPost === false ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
              <p className="text-base font-semibold">{LOGIN_TO_CHAT}</p>
              <p className="max-w-sm text-sm text-muted">Chat is only for people with an account, so the team&apos;s messages stay inside the team.</p>
              <Link
                href={`/login?returnTo=${encodeURIComponent("/chat")}`}
                className="rounded-full bg-[var(--blue)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Log in
              </Link>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.map((m) =>
                m.kind === "git_event" ? (
                  <p key={m.id} className="break-words rounded-2xl border border-line bg-bg px-4 py-2 text-sm text-muted [overflow-wrap:anywhere]">
                    <span className="font-medium text-fg">{m.author}</span>
                    {m.authorLogin && <Login login={m.authorLogin} />} {m.text} · <time suppressHydrationWarning>{time(m.createdAt)}</time>
                  </p>
                ) : (
                  <div key={m.id} className={`rise group flex flex-col ${m.author === name ? "items-end" : "items-start"}`}>
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-fg">{m.author}</span>
                      {m.authorLogin && <Login login={m.authorLogin} />} · <time suppressHydrationWarning>{time(m.createdAt)}</time>
                      {m.pinned && " · 📌 pinned"}
                      <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <button onClick={() => togglePin(m)} className={pinBtn}>
                          {m.pinned ? "Unpin" : "Pin"}
                        </button>
                        {chat !== GENERAL && (
                          <>
                            <button onClick={() => setPinForm({ id: m.id, kind: "decision", fields: decisionFields(m) })} className={pinBtn}>
                              Decision
                            </button>
                            <button onClick={() => setPinForm({ id: m.id, kind: "gotcha", fields: gotchaFields(m) })} className={pinBtn}>
                              Gotcha
                            </button>
                          </>
                        )}
                      </span>
                    </p>
                    <p className={`mt-1 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border border-black px-4 py-2.5 text-sm ${m.author === name ? "bg-cyan" : "bg-bg"}`}>{m.text}</p>
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
              {botReplies.map((r) => (
                <div key={r.id} className="rounded-md border border-dashed border-line bg-bg p-3 text-sm">
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-fg">🤖 @cocommit</span> · “{r.question}” · only you can see this
                    <button onClick={() => setBotReplies((now) => now.filter((x) => x.id !== r.id))} className="ml-2" aria-label="Dismiss">
                      ✕
                    </button>
                  </p>
                  {!r.result && !r.error && <p className="mt-1 text-muted">Looking through COCOMMIT/…</p>}
                  {r.error && (
                    <p className="mt-1 text-removed">
                      {r.error}{" "}
                      {r.needsLogin && (
                        <a href={signInHref("/chat")} className="underline">
                          Log in with GitHub
                        </a>
                      )}
                    </p>
                  )}
                  {r.result && (
                    <>
                      <p className="mt-1 whitespace-pre-wrap break-words">{r.result.answer}</p>
                      {r.result.sources.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs">
                          {r.result.sources.map((s) => (
                            <li key={s.path}>
                              <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                                {s.path}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2">
                        <Button type="button" variant="ghost" onClick={() => shareReply(r)} disabled={r.shared}>
                          {r.shared ? "Shared" : "Share to chat"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={end} />
            </div>
          )}
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
          {mayPost !== false && (
            <>
              <p className="mt-3 text-xs text-muted">
                You: <span className="font-medium text-fg">{name ?? "…"}</span>
                <Link href="/profile" className="ml-2 underline">
                  Change name
                </Link>
              </p>
              <form onSubmit={send} className="mt-2 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Message the team · @cocommit to ask the bot"
                  disabled={!mayPost}
                  className="min-w-0 flex-1 rounded-full border border-black/20 bg-[#f0ece3] px-5 py-3 text-sm"
                />
                <Button type="submit" variant="blue" aria-label="Send" disabled={!text.trim() || !mayPost} className="grid size-12 place-items-center !p-0">
                  <Icon name="send" className="size-5" />
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </MessagesShell>
  );
}

// A poster's GitHub login, verified by the database (only GitHub sign-ins have one).
function Login({ login }: { login: string }) {
  return (
    <span className="ml-1 text-muted" title="Verified GitHub account">
      @{login} ✓
    </span>
  );
}
