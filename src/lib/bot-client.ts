// Asks the @cocommit bot from browser code ("use client" screens), through POST /api/bot, and keeps the
// Assistant's settings (model, branch, don't-read list, own API key, debug) in this browser.
//
//   import { askBot, BotRequestError, loadBotSettings } from "@/lib/bot-client";
//   const { answer, sources } = await askBot("GI-04/CoCommit", "where is login handled?", chatLines, loadBotSettings());

import { parsePatterns, type ApiFormat, type BotAnswer, type BotDebug, type BotMode, type Change, type ChatLine, type ModelChoice } from "./bot";
import type { Commit, PullRequest } from "./github-types";

export class BotRequestError extends Error {
  status: number;
  debug?: BotDebug;
  constructor(status: number, message: string, debug?: BotDebug) {
    super(message);
    this.name = "BotRequestError";
    this.status = status;
    this.debug = debug;
  }
}

export type BotSettings = {
  /** "edit" lets the Assistant stage file changes (never committed without "Create pull request"). */
  mode: BotMode;
  model: ModelChoice;
  customModel: string;
  /** "" = the repo's default branch */
  branch: string;
  /** One don't-read pattern per line. */
  exclude: string;
  debug: boolean;
  apiKey: string;
  workspaceId: string;
  apiUrl: string;
  /** "openai" = the URL speaks Chat Completions (Gemini, OpenRouter…), not Anthropic's API. */
  apiFormat: ApiFormat;
  /** Keep the API key after the tab closes (localStorage instead of sessionStorage). */
  rememberKey: boolean;
};

export const DEFAULT_SETTINGS: BotSettings = {
  mode: "ask",
  model: "fast",
  customModel: "",
  branch: "",
  exclude: "",
  debug: false,
  apiKey: "",
  workspaceId: "",
  apiUrl: "",
  apiFormat: "anthropic",
  rememberKey: false,
};

const KEY = "cocommit.bot.settings";
const SECRET = "cocommit.bot.key";

// Storage can throw (private windows, blocked site data); settings then just aren't kept.
const read = (store: () => Storage, key: string) => {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
};
const write = (store: () => Storage, key: string, value: string | null) => {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {}
};

export function loadBotSettings(): BotSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  let saved: Partial<BotSettings> = {};
  try {
    saved = JSON.parse(read(() => localStorage, KEY) ?? "{}");
  } catch {}
  const secret = read(() => localStorage, SECRET) ?? read(() => sessionStorage, SECRET) ?? "";
  let key: { apiKey?: string; workspaceId?: string; apiUrl?: string } = {};
  try {
    key = JSON.parse(secret || "{}");
  } catch {}
  return { ...DEFAULT_SETTINGS, ...saved, apiKey: key.apiKey ?? "", workspaceId: key.workspaceId ?? "", apiUrl: key.apiUrl ?? "" };
}

/** The API key, workspace ID and URL go to sessionStorage, or localStorage when rememberKey is on; the rest to localStorage. */
export function saveBotSettings(s: BotSettings): void {
  const { apiKey, workspaceId, apiUrl, ...rest } = s;
  write(() => localStorage, KEY, JSON.stringify(rest));
  const secret = apiKey || workspaceId || apiUrl ? JSON.stringify({ apiKey, workspaceId, apiUrl }) : null;
  write(() => localStorage, SECRET, s.rememberKey ? secret : null);
  write(() => sessionStorage, SECRET, s.rememberKey ? null : secret);
}

/** `changes`: staged changes from the previous Edit answer, so the next question builds on them. */
export async function askBot(
  repo: string,
  question: string,
  chat: ChatLine[] = [],
  settings: BotSettings = loadBotSettings(),
  changes: Change[] = [],
): Promise<BotAnswer> {
  const res = await fetch("/api/bot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo,
      question,
      chat,
      model: settings.model,
      customModel: settings.customModel || undefined,
      branch: settings.branch || undefined,
      exclude: parsePatterns(settings.exclude),
      debug: settings.debug,
      // The URL, workspace and format only go with your own key: the panel hides them without one,
      // and a leftover URL would make the server refuse the team key.
      apiKey: settings.apiKey || undefined,
      workspaceId: (settings.apiKey && settings.workspaceId) || undefined,
      apiUrl: (settings.apiKey && settings.apiUrl) || undefined,
      mode: settings.mode,
      changes: settings.mode === "edit" ? changes.map(({ path, content }) => ({ path, content })) : undefined,
      apiFormat: settings.apiKey && settings.apiFormat === "openai" ? "openai" : undefined,
    }),
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new BotRequestError(res.status, data?.error ?? res.statusText, data?.debug);
  return data as BotAnswer;
}

export type ApplyResult = { branch: string; commit: Commit; pr: PullRequest };

/** "Create pull request": one commit with `changes` on a new assistant/… branch made from `base`, then a PR into `base`. */
export async function applyChanges(repo: string, base: string, title: string, changes: Change[], settings: BotSettings = loadBotSettings(), note = ""): Promise<ApplyResult> {
  const res = await fetch("/api/bot/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo, base: base || undefined, title, body: note, changes: changes.map(({ path, content }) => ({ path, content })), exclude: parsePatterns(settings.exclude) }),
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new BotRequestError(res.status, data?.error ?? res.statusText);
  return data as ApplyResult;
}
