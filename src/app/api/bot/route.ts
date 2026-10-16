import { NextResponse } from "next/server";
import {
  EDIT_PROMPT,
  EDIT_TOOLS,
  isEditToolName,
  isToolName,
  MAX_CHANGED_FILES,
  MAX_EDIT_BYTES,
  MAX_ROUNDS,
  isExcluded,
  parsePatterns,
  pickModel,
  readApiUrl,
  SYSTEM_PROMPT,
  TOOLS,
  type BotAnswer,
  type BotDebug,
  type BotSource,
  type ChatLine,
  type DebugRound,
} from "@/lib/bot";
import { changeViews, cleanPath, loadSnapshot, runTool } from "@/lib/bot-tools";
import { getSession, GitHubError } from "@/lib/github";

// POST /api/bot { repo, question, chat?, model?, customModel?, branch?, exclude?, apiKey?, workspaceId?, apiUrl?, debug?, mode?, changes? }
//   → { answer, sources, debug?, changes? }
// mode "edit" adds the edit tools: changes are only staged and come back in `changes` (with diffs). Nothing is
// written to GitHub here; POST /api/bot/apply commits them to a new branch and opens a pull request.
// The @cocommit bot: Claude reads the repo on the picked branch with the tools in src/lib/bot.ts.
// Claude is called with plain fetch (like our GitHub client), so there's no SDK to install.
// A user's own API key is used for that one request and never stored, logged or echoed back.

export const maxDuration = 300;

const ANTHROPIC = "https://api.anthropic.com/v1/messages";
const MAX_QUESTION = 2000;
const MAX_CHAT = 200;
// Past this, the next round must answer. Ask stays quick; Edit gets longer (the function may run 300 s).
const LIMITS = { ask: { rounds: MAX_ROUNDS, lastAfterMs: 40_000 }, edit: { rounds: 20, lastAfterMs: 240_000 } };
const EDIT_SYSTEM = SYSTEM_PROMPT + EDIT_PROMPT;
const EDIT_TOOLSET = [...TOOLS, ...EDIT_TOOLS];

type Block = { type: string; [key: string]: unknown };
type Message = { role: "user" | "assistant"; content: string | Block[] };
type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
type ClaudeResponse = { content: Block[]; stop_reason: string | null; usage?: Usage };
type Api = { url: string; key: string; workspace?: string; official: boolean };

class ClaudeError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const fail = (status: number, error: string, debug?: BotDebug) => NextResponse.json(debug ? { error, debug } : { error }, { status });

function readChat(value: unknown): ChatLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_CHAT)
    .filter((m): m is ChatLine => !!m && typeof m.author === "string" && typeof m.text === "string" && typeof m.createdAt === "string")
    .map((m) => ({ author: m.author.slice(0, 60), text: m.text.slice(0, 2000), createdAt: m.createdAt.slice(0, 40) }));
}

const readExclude = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim().slice(0, 200)).filter(Boolean).slice(0, 100) : typeof value === "string" ? parsePatterns(value) : [];

/** Which key and URL to call: the user's own if given, else the server's. Null = none set up. */
function pickApi(body: Record<string, unknown>): Api | null | Error {
  const userKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (userKey && (userKey.length > 400 || /\s/.test(userKey))) return new Error("That API key doesn't look right.");
  const read = readApiUrl(body.apiUrl);
  if ("error" in read) return new Error(read.error);
  const url = read.url;
  if (userKey) {
    const ws = typeof body.workspaceId === "string" && /^wrkspc_[A-Za-z0-9]+$/.test(body.workspaceId.trim()) ? body.workspaceId.trim() : undefined;
    return { url: url ?? ANTHROPIC, key: userKey, workspace: ws, official: !url };
  }
  if (url) return new Error("Add your own API key to use a custom API URL.");
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? { url: ANTHROPIC, key, workspace: process.env.ANTHROPIC_WORKSPACE_ID || undefined, official: true } : null;
}

async function callClaude(api: Api, pick: ReturnType<typeof pickModel>, messages: Message[], lastRound: boolean, edit: boolean): Promise<ClaudeResponse> {
  const headers: Record<string, string> = { "x-api-key": api.key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  // Keys that aren't scoped to a workspace (sk-ant-usr-…) must name one on every request.
  if (api.workspace) headers["anthropic-workspace-id"] = api.workspace;
  const fallbacks = pick.fallbacks && api.official;
  if (fallbacks) headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
  const res = await fetch(api.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: pick.model,
      max_tokens: 8000,
      ...(pick.effort ? { output_config: { effort: pick.effort } } : {}),
      ...(fallbacks ? { fallbacks: "default" } : {}),
      // Tools come before the system prompt in the cache prefix, so this one breakpoint covers both.
      system: [{ type: "text", text: edit ? EDIT_SYSTEM : SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      cache_control: { type: "ephemeral" }, // also caches the growing conversation between tool rounds
      tools: edit ? EDIT_TOOLSET : TOOLS,
      tool_choice: { type: lastRound ? "none" : "auto" },
      messages,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    const detail = data?.error?.message ?? res.statusText;
    console.error(`[bot] Claude API ${res.status}`, detail);
    throw new ClaudeError(res.status, res.status === 429 ? `The AI is busy right now (429). Try again in a minute. ${detail}` : `Claude API error (${res.status}): ${detail}`);
  }
  return (await res.json()) as ClaudeResponse;
}

const textOf = (content: Block[]) =>
  content
    .filter((b) => b.type === "text")
    .map((b) => String(b.text))
    .join("\n")
    .trim();

const short = (text: string, max = 400) => (text.length > max ? `${text.slice(0, max)}…` : text);

/** Sources the answer mentions (by file path or "#N"); if it mentions none, everything the tools read. One per file: the last (most specific) wins. */
function pickSources(answer: string, used: BotSource[]): BotSource[] {
  const unique = [...new Map(used.map((s) => [s.path.replace(/:\d+(-\d+)?$/, ""), s])).values()];
  const named = unique.filter((s) => {
    const label = s.path.replace(/:\d+(-\d+)?$/, "");
    const num = label.match(/#(\d+)$/)?.[1];
    return num ? answer.includes(`#${num}`) : answer.includes(label) || answer.includes(label.split("/").pop()!);
  });
  return (named.length ? named : unique).slice(0, 15);
}

/** Staged changes sent back from the browser (from an earlier Edit answer). Bad or excluded entries are dropped. */
function readChanges(value: unknown, exclude: string[]): Map<string, string | null> {
  const out = new Map<string, string | null>();
  if (!Array.isArray(value)) return out;
  for (const c of value.slice(0, MAX_CHANGED_FILES)) {
    const path = c && typeof c === "object" ? cleanPath((c as { path?: unknown }).path) : null;
    const content = (c as { content?: unknown })?.content;
    if (!path || isExcluded(path, exclude)) continue;
    if (content === null || (typeof content === "string" && Buffer.byteLength(content) <= MAX_EDIT_BYTES)) out.set(path, content);
  }
  return out;
}

export async function POST(req: Request) {
  const started = Date.now();
  if (!req.headers.get("content-type")?.includes("application/json")) return fail(415, "Send JSON.");
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const repo = typeof body.repo === "string" ? body.repo : "";
  const question = typeof body.question === "string" ? body.question.trim().slice(0, MAX_QUESTION) : "";
  if (!repo || !question) return fail(400, "Send { repo, question }.");

  const api = pickApi(body);
  if (api instanceof Error) return fail(400, api.message);
  if (!api) return fail(503, "The @cocommit bot isn't set up yet (ANTHROPIC_API_KEY is missing). You can add your own API key in the Assistant's settings.");

  const pick = pickModel(body.model, body.customModel);
  const exclude = readExclude(body.exclude);
  const wantDebug = body.debug === true;
  const edit = body.mode === "edit";
  const limits = edit ? LIMITS.edit : LIMITS.ask;
  const debug: BotDebug = { model: pick.model, branch: "", rounds: [], totalMs: 0, snapshot: "" };
  const done = (extra: Partial<BotDebug> = {}) => (wantDebug ? { ...debug, ...extra, totalMs: Date.now() - started } : undefined);

  try {
    const session = await getSession();
    if (!session.user) return fail(401, "Log in with GitHub so the bot can read the repo.");
    const branch = typeof body.branch === "string" && body.branch.trim() ? body.branch.trim().slice(0, 250) : null;
    const snapStart = Date.now();
    const { snap, cached } = await loadSnapshot(session.user.login, repo, branch);
    debug.branch = snap.branch;
    debug.snapshot = cached ? `cached copy (${snap.files.length} files)` : `downloaded ${snap.files.length} files in ${Date.now() - snapStart} ms`;

    const changes = edit ? readChanges(body.changes, exclude) : undefined;
    const ctx = { repo, snap, chat: readChat(body.chat), exclude, mode: edit ? ("edit" as const) : ("ask" as const), changes };
    const today = new Date().toISOString().slice(0, 10);
    const hidden = exclude.length ? `\nThe user asked not to read: ${exclude.join(", ")}.` : "";
    const staged = changes?.size
      ? `\nAlready staged from earlier in this conversation (reads show them): ${[...changes].map(([p, c]) => `${p}${c === null ? " (deleted)" : ""}`).join(", ")}.`
      : "";
    const messages: Message[] = [
      { role: "user", content: `Today is ${today} (UTC). Repo: ${repo}, branch: ${snap.branch}. Mode: ${edit ? "edit" : "ask (read-only)"}.${hidden}${staged}\n\n${question}` },
    ];
    const used: BotSource[] = [];
    let answer = "";

    for (let round = 1; round <= limits.rounds; round++) {
      const last = round === limits.rounds || Date.now() - started > limits.lastAfterMs;
      const roundStart = Date.now();
      const res = await callClaude(api, pick, messages, last, edit);
      const step: DebugRound = {
        round,
        model: pick.model,
        ms: Date.now() - roundStart,
        stop: res.stop_reason,
        usage: {
          input: res.usage?.input_tokens ?? 0,
          output: res.usage?.output_tokens ?? 0,
          cacheRead: res.usage?.cache_read_input_tokens ?? 0,
          cacheWrite: res.usage?.cache_creation_input_tokens ?? 0,
        },
        tools: [],
      };
      debug.rounds.push(step);
      if (res.stop_reason === "refusal") {
        answer = "Sorry, I can't help with that one.";
        break;
      }
      if (res.stop_reason !== "tool_use" || last) {
        answer = textOf(res.content) + (res.stop_reason === "max_tokens" ? "\n…(answer cut short)" : "");
        break;
      }
      // Send the assistant turn back unchanged (thinking blocks included), then all tool results in one user turn.
      messages.push({ role: "assistant", content: res.content });
      const calls = res.content.filter((b) => b.type === "tool_use");
      const results = await Promise.all(
        calls.map(async (call): Promise<Block> => {
          const name = String(call.name);
          const input = (call.input && typeof call.input === "object" ? call.input : {}) as Record<string, unknown>;
          const toolStart = Date.now();
          let content: string;
          let isError = false;
          if (!isToolName(name) && !(edit && isEditToolName(name))) {
            content = isEditToolName(name) ? "Editing is off. Ask the user to switch the Assistant to Edit mode." : `Unknown tool: ${name}`;
            isError = true;
          } else {
            try {
              const out = await runTool(name, input, ctx);
              used.push(...out.used);
              content = out.text;
            } catch (e) {
              content = e instanceof Error ? e.message : "Tool failed.";
              isError = true;
            }
          }
          step.tools.push({ name, input, ms: Date.now() - toolStart, result: short(content), ...(isError ? { error: true } : {}) });
          return { type: "tool_result", tool_use_id: call.id, content, ...(isError ? { is_error: true } : {}) };
        }),
      );
      messages.push({ role: "user", content: results });
    }

    const result: BotAnswer = { answer: answer || "I couldn't find an answer in the repo.", sources: pickSources(answer, used) };
    if (edit) result.changes = changeViews(ctx);
    const trace = done();
    return NextResponse.json(trace ? { ...result, debug: trace } : result);
  } catch (e) {
    if (e instanceof ClaudeError) return fail(e.status === 401 || e.status === 403 ? 400 : 502, e.message, done({ error: e.message }));
    const status = e instanceof GitHubError ? e.status : 502;
    if (status === 401) return fail(401, "Log in with GitHub so the bot can read the repo.");
    if (status >= 500) console.error("[bot] failed", e);
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return fail(status, message, done({ error: message }));
  }
}
