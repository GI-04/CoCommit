import { NextResponse } from "next/server";
import { BOT_MODEL, isToolName, MAX_ROUNDS, SYSTEM_PROMPT, toGithubLink, TOOLS, type BotAnswer, type ChatLine } from "@/lib/bot";
import { loadSnapshot, runTool } from "@/lib/bot-tools";
import { getSession, GitHubError } from "@/lib/github";

// POST /api/bot { repo, question, chat? } → { answer, sources }
// The @cocommit chat bot: Claude reads the repo's COCOMMIT/ folder with the tools in src/lib/bot.ts.
// Claude is called with plain fetch (like our GitHub client), so there's no SDK to install.

export const maxDuration = 60;

const API_URL = "https://api.anthropic.com/v1/messages";
const MAX_QUESTION = 1000;
const MAX_CHAT = 200;

type Block = { type: string; [key: string]: unknown };
type Message = { role: "user" | "assistant"; content: string | Block[] };
type ClaudeResponse = { content: Block[]; stop_reason: string | null };

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

function readChat(value: unknown): ChatLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_CHAT)
    .filter((m): m is ChatLine => !!m && typeof m.author === "string" && typeof m.text === "string" && typeof m.createdAt === "string")
    .map((m) => ({ author: m.author.slice(0, 60), text: m.text.slice(0, 2000), createdAt: m.createdAt.slice(0, 40) }));
}

async function callClaude(key: string, messages: Message[], lastRound: boolean): Promise<ClaudeResponse> {
  const headers: Record<string, string> = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  // Keys that aren't scoped to a workspace (sk-ant-usr-…) must name one on every request.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  if (workspace) headers["anthropic-workspace-id"] = workspace;
  const res = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: BOT_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      // Tools come before the system prompt in the cache prefix, so this one breakpoint covers both.
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      cache_control: { type: "ephemeral" }, // also caches the growing conversation between tool rounds
      tools: TOOLS,
      tool_choice: { type: lastRound ? "none" : "auto" },
      messages,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    console.error(`[bot] Claude API ${res.status}`, data?.error?.message);
    throw new Error(res.status === 429 ? "The bot is busy right now. Try again in a minute." : `Claude API error (${res.status}).`);
  }
  return (await res.json()) as ClaudeResponse;
}

const textOf = (content: Block[]) =>
  content
    .filter((b) => b.type === "text")
    .map((b) => String(b.text))
    .join("\n")
    .trim();

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fail(503, "The @cocommit bot isn't set up yet (ANTHROPIC_API_KEY is missing).");
  if (!req.headers.get("content-type")?.includes("application/json")) return fail(415, "Send JSON.");
  const body = (await req.json().catch(() => null)) as { repo?: unknown; question?: unknown; chat?: unknown } | null;
  const repo = typeof body?.repo === "string" ? body.repo : "";
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, MAX_QUESTION) : "";
  if (!repo || !question) return fail(400, "Send { repo, question }.");

  try {
    const session = await getSession();
    if (!session.user) return fail(401, "Log in with GitHub so the bot can read the team's files.");
    const snap = await loadSnapshot(session.user.login, repo);
    if (!snap) return fail(404, `${repo} has no COCOMMIT/ folder yet. Set up team context first.`);

    const ctx = { repo, snap, chat: readChat(body?.chat) };
    const today = new Date().toISOString().slice(0, 10);
    const messages: Message[] = [{ role: "user", content: `Today is ${today} (UTC). Repo: ${repo}.\n\n${question}` }];
    const used = new Set<string>();
    let answer = "";

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const res = await callClaude(key, messages, round === MAX_ROUNDS);
      if (res.stop_reason === "refusal") {
        answer = "Sorry, I can't help with that one.";
        break;
      }
      if (res.stop_reason !== "tool_use") {
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
          if (!isToolName(name)) return { type: "tool_result", tool_use_id: call.id, content: `Unknown tool: ${name}`, is_error: true };
          try {
            const out = await runTool(name, input, ctx);
            out.used.forEach((p) => used.add(p));
            return { type: "tool_result", tool_use_id: call.id, content: out.text };
          } catch (e) {
            return { type: "tool_result", tool_use_id: call.id, content: e instanceof Error ? e.message : "Tool failed.", is_error: true };
          }
        }),
      );
      messages.push({ role: "user", content: results });
    }

    // Link the files the answer names; if it names none, link every file the tools read.
    const named = [...used].filter((p) => answer.includes(p) || answer.includes(p.split("/").pop()!));
    const sources = (named.length ? named : [...used]).map((path) => ({ path, url: toGithubLink(repo, snap.branch, path) }));
    return NextResponse.json({ answer: answer || "I couldn't find an answer in the team's files.", sources } satisfies BotAnswer);
  } catch (e) {
    const status = e instanceof GitHubError ? e.status : 502;
    if (status === 401) return fail(401, "Log in with GitHub so the bot can read the team's files.");
    if (status >= 500) console.error("[bot] failed", e);
    return fail(status, e instanceof Error ? e.message : "Something went wrong.");
  }
}
