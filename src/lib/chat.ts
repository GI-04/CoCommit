// Chat: one live channel per repo, through Supabase Realtime. Browser code only ("use client" screens).
// There's no app login for the demo: chat signs in to Supabase anonymously (Anonymous sign-ins must be on in
// Supabase) and shows the GitHub name from the git-buttons sign-in.
// Without the Supabase keys it runs in fake mode: messages are kept in this browser (localStorage) and
// reach other tabs instantly (BroadcastChannel), so two tabs can chat before the keys exist.
// Table and access rules: supabase/schema.sql.

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Session } from "./github-types";
import { getSupabase, supabaseConfigured } from "./supabase";

type Supabase = NonNullable<ReturnType<typeof getSupabase>>;

// Same shape as ChatMessage in mock.ts.
export type ChatMessage = {
  id: string;
  repo: string;
  author: string;
  text: string;
  kind: "text" | "git_event";
  pinned: boolean;
  createdAt: string;
};

/** True while the Supabase keys aren't set (messages stay in this browser). */
export const chatFake = !supabaseConfigured;

type Row = { id: string; repo: string; author: string; text: string; kind: ChatMessage["kind"]; pinned: boolean; created_at: string };
const COLUMNS = "id, repo, author, text, kind, pinned, created_at";
const toMessage = (r: Row): ChatMessage => ({
  id: r.id,
  repo: r.repo,
  author: r.author,
  text: r.text,
  kind: r.kind,
  pinned: r.pinned,
  createdAt: r.created_at,
});

/** Adds a message to a list, or replaces it if it's already there (same id). Keeps oldest first. */
export function mergeMessage(list: ChatMessage[], m: ChatMessage): ChatMessage[] {
  const next = list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m];
  return next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

let nameOnce: Promise<string> | null = null;

/** The name shown in chat: the GitHub account, else a Google login, else a guest name for this tab (so two tabs look like two people). */
export function myName(): Promise<string> {
  nameOnce ??= resolveName();
  return nameOnce;
}

async function resolveName(): Promise<string> {
  try {
    const res = await fetch("/api/github/getSession", { method: "POST", headers: { "Content-Type": "application/json" }, body: "[]" });
    const s = (await res.json()) as Session;
    if (res.ok && s.user && !s.fake) return s.user.name || s.user.login;
  } catch {
    // Not signed in to GitHub, or offline: fall through.
  }
  const { data } = (await getSupabase()?.auth.getUser()) ?? { data: { user: null } };
  const google = data.user && !data.user.is_anonymous ? (data.user.user_metadata?.full_name ?? data.user.email) : null;
  return google ?? fake.name();
}

let sessionOnce: Promise<void> | null = null;

/** Signs in to Supabase anonymously (once per page) if nobody is signed in, so the "signed-in users only" table rules let chat through. */
function ensureSession(supabase: Supabase): Promise<void> {
  sessionOnce ??= (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      throw new Error(
        /anonymous/i.test(error.message)
          ? "Chat needs Anonymous sign-ins turned on in Supabase (Authentication > Sign In / Providers)."
          : /fetch/i.test(error.message)
            ? "Can't reach the chat server (Supabase). Check the internet connection and the Supabase keys."
            : error.message,
      );
    }
  })().catch((e: Error) => {
    sessionOnce = null;
    throw e;
  });
  return sessionOnce;
}

/** Turns a Supabase error into a message people can act on. */
function friendly(e: { code?: string; message: string }): string {
  if (e.code === "42P01" || e.code === "PGRST205" || /does not exist|could not find the table/i.test(e.message)) {
    return "Chat isn't set up yet: run supabase/schema.sql in Supabase.";
  }
  if (e.code === "42501") return "Chat refused the message: try reloading the page.";
  return e.message;
}

/** The latest messages for a repo, oldest first. */
export async function loadMessages(repo: string, limit = 100): Promise<ChatMessage[]> {
  const supabase = getSupabase();
  if (!supabase) return fake.read().filter((m) => m.repo === repo).slice(-limit);
  await ensureSession(supabase);
  const { data, error } = await supabase
    .from("messages")
    .select(COLUMNS)
    .eq("repo", repo)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(friendly(error));
  return (data as Row[]).map(toMessage).reverse();
}

export async function sendMessage(repo: string, text: string): Promise<ChatMessage> {
  return post(repo, text, "text");
}

/** Posts a git event (a commit or PR) into the repo's chat. github-client.ts calls this after each commit and PR. */
export async function postGitEvent(repo: string, summary: string): Promise<ChatMessage> {
  return post(repo, summary, "git_event");
}

async function post(repo: string, text: string, kind: ChatMessage["kind"]): Promise<ChatMessage> {
  const body = text.trim();
  if (!body) throw new Error("Write a message first.");
  const author = await myName();
  const supabase = getSupabase();
  if (!supabase) {
    const m: ChatMessage = { id: crypto.randomUUID(), repo, author, text: body, kind, pinned: false, createdAt: new Date().toISOString() };
    fake.save(m);
    return m;
  }
  await ensureSession(supabase);
  const { data, error } = await supabase.from("messages").insert({ repo, author, text: body, kind }).select(COLUMNS).single();
  if (error) throw new Error(friendly(error));
  return toMessage(data as Row);
}

/** Pins a message (or unpins it with `pinned: false`). */
export async function pinMessage(id: string, pinned = true): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    const m = fake.read().find((x) => x.id === id);
    if (m) fake.save({ ...m, pinned });
    return;
  }
  await ensureSession(supabase);
  const { error } = await supabase.from("messages").update({ pinned }).eq("id", id);
  if (error) throw new Error(friendly(error));
}

/** Calls `onMessage` for every new message and pin change in a repo, live. Returns a function that stops listening. */
export function subscribe(repo: string, onMessage: (m: ChatMessage) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) {
    const channel = new BroadcastChannel(fake.channel(repo));
    channel.onmessage = (e: MessageEvent<ChatMessage>) => onMessage(e.data);
    return () => channel.close();
  }
  // Listen only after signing in: the table rules hide live changes from signed-out clients.
  let channel: RealtimeChannel | null = null;
  let stopped = false;
  const filter = `repo=eq.${repo}`;
  ensureSession(supabase)
    .then(() => {
      if (stopped) return;
      channel = supabase
        .channel(`messages:${repo}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, (p) => onMessage(toMessage(p.new as Row)))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter }, (p) => onMessage(toMessage(p.new as Row)))
        .subscribe();
    })
    .catch(() => {
      // loadMessages shows the same error to the user.
    });
  return () => {
    stopped = true;
    if (channel) supabase.removeChannel(channel);
  };
}

/** Calls `onChange` with the names of everyone who has this repo's chat open, live. Returns a stop function. */
export function onlineUsers(repo: string, onChange: (names: string[]) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return fake.online(repo, onChange);

  let channel: RealtimeChannel | null = null;
  let stopped = false;
  Promise.all([myName(), ensureSession(supabase)]).then(([name]) => {
    if (stopped) return;
    const ch = supabase.channel(`online:${repo}`, { config: { presence: { key: crypto.randomUUID() } } });
    channel = ch;
    ch.on("presence", { event: "sync" }, () => {
      const people = Object.values(ch.presenceState<{ name: string }>()).flat();
      onChange(unique(people.map((p) => p.name)));
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") void ch.track({ name });
    });
  }).catch(() => {
    // loadMessages shows the same error to the user.
  });
  return () => {
    stopped = true;
    if (channel) supabase.removeChannel(channel);
  };
}

const unique = (names: string[]) => [...new Set(names)].sort((a, b) => a.localeCompare(b));

// ---------- Fake mode: this browser only (localStorage + BroadcastChannel between tabs).

const fake = {
  key: "cocommit-chat-messages",
  channel: (repo: string) => `cocommit-chat:${repo}`,

  name(): string {
    try {
      let name = sessionStorage.getItem("cocommit-chat-name");
      if (!name) {
        name = `Guest ${Math.floor(100 + Math.random() * 900)}`;
        sessionStorage.setItem("cocommit-chat-name", name);
      }
      return name;
    } catch {
      return "Guest";
    }
  },

  read(): ChatMessage[] {
    try {
      return JSON.parse(localStorage.getItem(fake.key) ?? "[]") as ChatMessage[];
    } catch {
      return [];
    }
  },

  /** Saves a new or changed message and tells the other listeners (other tabs, and other screens in this tab). */
  save(m: ChatMessage): void {
    try {
      localStorage.setItem(fake.key, JSON.stringify(mergeMessage(fake.read(), m).slice(-500)));
    } catch {
      // Storage full or blocked: the message still reaches open tabs.
    }
    const out = new BroadcastChannel(fake.channel(m.repo));
    out.postMessage(m);
    out.close();
  },

  online(repo: string, onChange: (names: string[]) => void): () => void {
    const channel = new BroadcastChannel(`cocommit-online:${repo}`);
    const me = { tab: crypto.randomUUID(), name: fake.name() };
    const seen = new Map<string, { name: string; at: number }>();
    const emit = () => {
      const now = Date.now();
      for (const [tab, v] of seen) if (now - v.at > 12_000) seen.delete(tab);
      onChange(unique([me.name, ...[...seen.values()].map((v) => v.name)]));
    };
    channel.onmessage = (e: MessageEvent<{ type: "hello" | "here" | "bye"; tab: string; name?: string }>) => {
      const msg = e.data;
      if (msg.type === "bye") seen.delete(msg.tab);
      else {
        const isNew = !seen.has(msg.tab);
        seen.set(msg.tab, { name: msg.name ?? "Guest", at: Date.now() });
        if (isNew && msg.type === "hello") channel.postMessage({ type: "here", ...me });
      }
      emit();
    };
    const hello = () => channel.postMessage({ type: "hello", ...me });
    const bye = () => channel.postMessage({ type: "bye", tab: me.tab });
    hello();
    emit();
    const timer = setInterval(() => {
      hello();
      emit();
    }, 5_000);
    window.addEventListener("pagehide", bye);
    return () => {
      clearInterval(timer);
      bye();
      window.removeEventListener("pagehide", bye);
      channel.close();
    };
  },
};
