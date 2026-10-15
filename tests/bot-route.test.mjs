import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Drives POST /api/bot offline: a scripted fake Claude, fake GitHub reads, no network and no API key spent.
function load(path, imports, extra = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, console, URLSearchParams, Date, Promise, JSON, Map, Set,
    require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    ...extra,
  });
  return exports;
}
const plain = (x) => JSON.parse(JSON.stringify(x));

const files = {
  "COCOMMIT/DECISIONS.md": "# Decisions\n\n## 2026-10-15 · Use GitHub login\nWe log in with GitHub OAuth.",
  "COCOMMIT/LOG.md": "# Log\n\n- 2026-10-16 · Kin — desktop builds done",
};
const bot = load("lib/bot.ts", {});

function setup({ replies, signedIn = true, key = "sk-ant-test", workspace = "", snapshot = true, globalCache = {} }) {
  const github = {
    GitHubError: class GitHubError extends Error {
      constructor(status, message) { super(message); this.status = status; }
    },
    getSession: async () => ({ user: signedIn ? { login: "proud" } : null, fake: false }),
    listFolderFiles: async () => ({ branch: "main", paths: snapshot ? Object.keys(files) : [] }),
    readFile: async (_repo, _branch, path) => files[path] ?? null,
    listFileCommits: async () => [{ kind: "commit", author: "kin", text: "COCOMMIT: update log", at: "2026-10-16T01:00:00Z" }],
  };
  const tools = load("lib/bot-tools.ts", { "./bot": bot, "./github": github }, { globalThis: globalCache });
  const requests = [];
  const fetch = async (url, init) => {
    requests.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    const reply = replies.shift();
    return { ok: true, status: 200, json: async () => reply };
  };
  const route = load(
    "app/api/bot/route.ts",
    {
      "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      "@/lib/bot": bot,
      "@/lib/bot-tools": tools,
      "@/lib/github": github,
    },
    { fetch, process: { env: { ...(key ? { ANTHROPIC_API_KEY: key } : {}), ...(workspace ? { ANTHROPIC_WORKSPACE_ID: workspace } : {}) } } },
  );
  const post = (body) =>
    route.POST({ headers: { get: () => "application/json" }, json: async () => body });
  return { post, requests };
}

test("runs a tool round, then answers with links", async () => {
  const { post, requests } = setup({
    replies: [
      {
        stop_reason: "tool_use",
        content: [
          { type: "thinking", thinking: "", signature: "sig" },
          { type: "tool_use", id: "t1", name: "find_entry", input: { keyword: "login" } },
          { type: "tool_use", id: "t2", name: "read_file", input: { path: "DECISIONS.md" } },
        ],
      },
      { stop_reason: "end_turn", content: [{ type: "text", text: "We use GitHub login (COCOMMIT/DECISIONS.md)." }] },
    ],
  });
  const res = await post({ repo: "GI-04/CoCommit", question: "where is the login decision?", chat: [] });
  assert.equal(res.status, 200);
  assert.equal(res.body.answer, "We use GitHub login (COCOMMIT/DECISIONS.md).");
  assert.deepEqual(plain(res.body.sources), [
    { path: "COCOMMIT/DECISIONS.md", url: "https://github.com/GI-04/CoCommit/blob/main/COCOMMIT/DECISIONS.md" },
  ]);

  assert.equal(requests.length, 2);
  const [first, second] = requests;
  assert.equal(first.url, "https://api.anthropic.com/v1/messages");
  assert.equal(first.headers["anthropic-version"], "2023-06-01");
  assert.equal(first.body.model, "claude-haiku-5-5");
  assert.equal(first.body.tool_choice.type, "auto");
  assert.equal(first.body.system[0].cache_control.type, "ephemeral");
  assert.match(first.body.messages[0].content, /^Today is \d{4}-\d{2}-\d{2} \(UTC\)\. Repo: GI-04\/CoCommit\./);
  // The assistant turn goes back unchanged (thinking included); both tool results in one user turn.
  assert.equal(second.body.messages[1].content[0].type, "thinking");
  const results = second.body.messages[2].content;
  assert.deepEqual(results.map((r) => r.tool_use_id), ["t1", "t2"]);
  assert.match(results[0].content, /Use GitHub login/);
  assert.match(results[1].content, /We log in with GitHub OAuth/);
});

test("last round forbids tools; unknown tools and bad paths come back as errors", async () => {
  const toolTurn = (id) => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id, name: "read_file", input: { path: "../.env.local" } }] });
  const { post, requests } = setup({
    replies: [
      { stop_reason: "tool_use", content: [{ type: "tool_use", id: "x", name: "delete_file", input: {} }] },
      toolTurn("a"), toolTurn("b"), toolTurn("c"),
      { stop_reason: "end_turn", content: [{ type: "text", text: "Done." }] },
    ],
  });
  const res = await post({ repo: "o/r", question: "hi" });
  assert.equal(res.body.answer, "Done.");
  assert.equal(requests.length, 5);
  assert.equal(requests[4].body.tool_choice.type, "none");
  const unknown = requests[1].body.messages[2].content[0];
  assert.equal(unknown.is_error, true);
  assert.match(requests[2].body.messages[4].content[0].content, /No such file/);
});

test("refusal, missing key, signed out and no workspace give clear replies", async () => {
  let r = await setup({ replies: [{ stop_reason: "refusal", content: [] }] }).post({ repo: "o/r", question: "x" });
  assert.equal(r.body.answer, "Sorry, I can't help with that one.");

  r = await setup({ replies: [], key: "" }).post({ repo: "o/r", question: "x" });
  assert.equal(r.status, 503);

  r = await setup({ replies: [], signedIn: false }).post({ repo: "o/r", question: "x" });
  assert.equal(r.status, 401);

  r = await setup({ replies: [], snapshot: false }).post({ repo: "o/r", question: "x" });
  assert.equal(r.status, 404);

  r = await setup({ replies: [] }).post({ repo: "o/r", question: "  " });
  assert.equal(r.status, 400);
});

test("chat lines are passed to get_chat_messages", async () => {
  const { post, requests } = setup({
    replies: [
      { stop_reason: "tool_use", content: [{ type: "tool_use", id: "c", name: "get_chat_messages", input: { since: "2026-10-16" } }] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "Kin finished the builds." }] },
    ],
  });
  await post({
    repo: "o/r",
    question: "summarize today's chat",
    chat: [
      { author: "Kin", text: "builds done", createdAt: "2026-10-16T02:00:00Z" },
      { author: "Old", text: "yesterday", createdAt: "2026-10-15T02:00:00Z" },
      { bad: true },
    ],
  });
  assert.equal(requests[1].body.messages[2].content[0].content, "[2026-10-16T02:00] Kin: builds done");
});

test("sends the workspace ID only when it is set", async () => {
  const end = () => [{ stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] }];
  const withId = setup({ replies: end(), workspace: "wrkspc_test" });
  await withId.post({ repo: "o/r", question: "x" });
  assert.equal(withId.requests[0].headers["anthropic-workspace-id"], "wrkspc_test");
  const without = setup({ replies: end() });
  await without.post({ repo: "o/r", question: "x" });
  assert.equal("anthropic-workspace-id" in without.requests[0].headers, false);
});
