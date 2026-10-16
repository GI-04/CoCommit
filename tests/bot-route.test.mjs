import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import zlib from "node:zlib";
import test from "node:test";
import ts from "typescript";

// Drives POST /api/bot offline: a scripted fake Claude, a fake GitHub that serves a real .tar.gz built here,
// no network and no API key spent. The tar reader (src/lib/repo-snapshot.ts) runs for real.
function load(path, imports, extra = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, console, URL, URLSearchParams, Date, Promise, JSON, Map, Set, Buffer,
    require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    ...extra,
  });
  return exports;
}
const plain = (x) => JSON.parse(JSON.stringify(x));

/** A GitHub-style tarball: pax global header, "<top>/" folder, one pax "x" header for long names. */
function tarball(files, top = "GI-04-CoCommit-abc1234") {
  const parts = [];
  const header = (name, size, type) => {
    const h = Buffer.alloc(512);
    h.write(name.slice(0, 100), 0);
    h.write("0000644\0", 100);
    h.write(`${size.toString(8).padStart(11, "0")}\0`, 124);
    h.write(type, 156);
    h.write("ustar\0", 257);
    return h;
  };
  const push = (name, data, type) => {
    parts.push(header(name, data.length, type), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  };
  push("pax_global_header", Buffer.from("52 comment=abc1234abc1234abc1234abc1234abc1234abc\n"), "g");
  push(`${top}/`, Buffer.alloc(0), "5");
  for (const [path, content] of Object.entries(files)) {
    const name = `${top}/${path}`;
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    if (name.length > 100) {
      const base = ` path=${name}\n`.length;
      let len = base + 1;
      while (String(len).length + base !== len) len = String(len).length + base;
      push("PaxHeader", Buffer.from(`${len} path=${name}\n`), "x");
    }
    push(name.slice(0, 100), data, "0");
  }
  parts.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(parts));
}

const repoFiles = {
  "README.md": "# CoCommit\nGit for beginners, chat and tasks in one app.",
  "package.json": '{ "name": "cocommit", "dependencies": { "next": "16" } }',
  "src/lib/github.ts": "const API = 1;\nconst TOKEN_COOKIE = \"cc_github\";\nfunction seal(token) { return token; }",
  "src/app/page.tsx": "export default function Home() {}",
  "COCOMMIT/DECISIONS.md": "# Decisions\n\n## 2026-10-15 · Use GitHub login\nWe log in with GitHub OAuth.",
  "COCOMMIT/LOG.md": "# Log\n\n- 2026-10-16 · Kin — desktop builds done",
  "public/app.dmg": Buffer.from([0x78, 0x01, 0x00, 0x00, 0xff]),
  [`docs/${"very-long-folder-name/".repeat(5)}deep.md`]: "deep file",
};

function setup({ replies, signedIn = true, key = "sk-ant-team", workspace = "" }) {
  const calls = { tarball: [], resolve: [] };
  const github = {
    GitHubError: class GitHubError extends Error {
      constructor(status, message) { super(message); this.status = status; }
    },
    getSession: async () => ({ user: signedIn ? { login: "proud" } : null, fake: false }),
    resolveBranch: async (_repo, branch) => (calls.resolve.push(branch), branch || "main"),
    downloadTarball: async (_repo, branch) => (calls.tarball.push(branch), tarball(repoFiles)),
    listFileCommits: async () => [{ kind: "commit", author: "kin", text: "Add login", at: "2026-10-16T01:00:00Z" }],
    listBranches: async () => ["main", "feat/x"],
    listPulls: async () => [{ number: 3, title: "Add bot", author: "proud", state: "open", merged: false, head: "proud/bot", base: "main", updatedAt: "2026-10-16T00:00:00Z", url: "https://github.com/o/r/pull/3" }],
    getPull: async (_repo, n) => ({
      number: n, title: "Add bot", author: "proud", state: "open", merged: false, head: "proud/bot", base: "main", updatedAt: "2026-10-16T00:00:00Z",
      url: `https://github.com/o/r/pull/${n}`, body: "Adds the @cocommit bot.",
      files: [{ path: "src/lib/bot.ts", status: "added", additions: 10, deletions: 0, patch: "@@ +1 @@\n+export const BOT = 1;" }],
      comments: [{ author: "trin", at: "2026-10-16T02:00:00Z", body: "Looks good", path: "src/lib/bot.ts", line: 1 }],
    }),
    listIssues: async () => [],
    getIssue: async (_repo, n) => ({ number: n, title: "Login broken", author: "kin", state: "open", labels: ["bug"], commentCount: 1, updatedAt: "2026-10-16T00:00:00Z", url: `https://github.com/o/r/issues/${n}`, body: "Can't log in.", comments: [{ author: "proud", at: "2026-10-16T03:00:00Z", body: "Fixed in #3" }] }),
    getLanguages: async () => [["TypeScript", 900], ["Rust", 100]],
  };
  const bot = load("lib/bot.ts", {});
  const snapshot = load("lib/repo-snapshot.ts", { "node:zlib": zlib });
  const tools = load("lib/bot-tools.ts", { "./bot": bot, "./github": github, "./repo-snapshot": snapshot }, { globalThis: {} });
  const requests = [];
  const fetch = async (url, init) => {
    requests.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    const reply = replies.shift();
    if (reply?.httpStatus) return { ok: false, status: reply.httpStatus, statusText: "x", json: async () => ({ error: { message: reply.message } }) };
    return { ok: true, status: 200, json: async () => reply };
  };
  const env = { ...(key ? { ANTHROPIC_API_KEY: key } : {}), ...(workspace ? { ANTHROPIC_WORKSPACE_ID: workspace } : {}) };
  const route = load(
    "app/api/bot/route.ts",
    {
      "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      "@/lib/bot": bot,
      "@/lib/bot-tools": tools,
      "@/lib/github": github,
    },
    { fetch, process: { env } },
  );
  const post = (body) => route.POST({ headers: { get: () => "application/json" }, json: async () => body });
  return { post, requests, calls };
}

const toolTurn = (...uses) => ({
  stop_reason: "tool_use",
  usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 50, cache_creation_input_tokens: 10 },
  content: [{ type: "thinking", thinking: "", signature: "sig" }, ...uses.map(([name, input], i) => ({ type: "tool_use", id: `t${i}`, name, input }))],
});
const endTurn = (text) => ({ stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: "text", text }] });
const results = (request) => request.body.messages.at(-1).content.map((r) => r.content);

test("search hits become links when the answer names the file", async () => {
  const { post } = setup({ replies: [toolTurn(["search_files", { query: "export default" }]), endTurn("It's in src/app/page.tsx.")] });
  const res = await post({ repo: "o/r", question: "where is the home page?" });
  assert.deepEqual(plain(res.body.sources), [{ path: "src/app/page.tsx:1", url: "https://github.com/o/r/blob/main/src/app/page.tsx#L1" }]);
});

test("searches the code, reads lines and links to them", async () => {
  const { post, requests, calls } = setup({
    replies: [
      toolTurn(["search_files", { query: "token cookie" }]),
      toolTurn(["read_file", { path: "src/lib/github.ts", from_line: 2, to_line: 3 }]),
      endTurn("The cookie name is set in src/lib/github.ts:2."),
    ],
  });
  const res = await post({ repo: "GI-04/CoCommit", question: "where is the token cookie?" });
  assert.equal(res.status, 200);
  assert.deepEqual(plain(res.body.sources), [{ path: "src/lib/github.ts:2-3", url: "https://github.com/GI-04/CoCommit/blob/main/src/lib/github.ts#L2-L3" }]);
  assert.equal(res.body.debug, undefined);
  assert.deepEqual(calls.tarball, ["main"]);

  assert.match(results(requests[1])[0], /src\/lib\/github\.ts:2: const TOKEN_COOKIE = "cc_github";/);
  assert.match(results(requests[2])[0], /^src\/lib\/github\.ts \(lines 2-3 of 3\)\n2\| const TOKEN_COOKIE/);
  const first = requests[0];
  assert.equal(first.url, "https://api.anthropic.com/v1/messages");
  assert.equal(first.headers["x-api-key"], "sk-ant-team");
  assert.equal(first.headers["anthropic-beta"], undefined);
  assert.equal(first.body.model, "claude-haiku-5-5");
  assert.equal(first.body.output_config.effort, "low");
  assert.equal(first.body.fallbacks, undefined);
  assert.equal(first.body.tool_choice.type, "auto");
  assert.match(first.body.messages[0].content, /^Today is \d{4}-\d{2}-\d{2} \(UTC\)\. Repo: GI-04\/CoCommit, branch: main\./);
  // The assistant turn goes back unchanged (thinking included).
  assert.equal(requests[1].body.messages[1].content[0].type, "thinking");
});

test("project overview, long paths and binary files", async () => {
  const { post, requests } = setup({
    replies: [
      toolTurn(["get_project_overview", {}], ["read_file", { path: "public/app.dmg" }], ["list_folder", { path: "docs/very-long-folder-name/very-long-folder-name/very-long-folder-name/very-long-folder-name/very-long-folder-name" }]),
      endTurn("A Next.js app."),
    ],
  });
  await post({ repo: "o/r", question: "summarize this project" });
  const [overview, binary, folder] = results(requests[1]);
  assert.match(overview, /Repo o\/r, branch main: 8 files\./);
  assert.match(overview, /TypeScript 90\.0%, Rust 10\.0%/);
  assert.match(overview, /src\/ \(2 files\)/);
  assert.match(overview, /## README\.md\n# CoCommit/);
  assert.match(overview, /## package\.json\n\{ "name": "cocommit"/);
  assert.match(binary, /public\/app\.dmg is a binary or very large file \(5 B\)/);
  assert.equal(folder, "deep.md (9 B)");
});

test("Best model: fallbacks, effort and a debug trace; second question uses the cached repo", async () => {
  const { post, requests, calls } = setup({
    replies: [toolTurn(["list_branches", {}]), endTurn("Two branches."), endTurn("Again.")],
  });
  const res = await post({ repo: "o/r", question: "branches?", model: "best", debug: true });
  const first = requests[0];
  assert.equal(first.body.model, "claude-opus-5-5");
  assert.equal(first.body.output_config.effort, "medium");
  assert.equal(first.body.fallbacks, "default");
  assert.equal(first.headers["anthropic-beta"], "server-side-fallback-2026-07-01");
  const d = res.body.debug;
  assert.equal(d.model, "claude-opus-5-5");
  assert.equal(d.branch, "main");
  assert.match(d.snapshot, /^downloaded 8 files in \d+ ms$/);
  assert.equal(d.rounds.length, 2);
  assert.deepEqual(plain(d.rounds[0].usage), { input: 100, output: 20, cacheRead: 50, cacheWrite: 10 });
  assert.equal(d.rounds[0].tools[0].name, "list_branches");
  assert.equal(d.rounds[0].tools[0].result, "main\nfeat/x");

  const again = await post({ repo: "o/r", question: "again", debug: true });
  assert.match(again.body.debug.snapshot, /^cached copy \(8 files\)$/);
  assert.equal(calls.tarball.length, 1);
});

test("don't-read list hides files from search, listings and reads", async () => {
  const { post, requests } = setup({
    replies: [toolTurn(["search_files", { query: "token" }], ["read_file", { path: "./src/lib/github.ts" }], ["list_folder", {}], ["read_file", { path: "../etc/passwd" }]), endTurn("Hidden.")],
  });
  await post({ repo: "o/r", question: "find token", exclude: ["src/"] });
  const [search, read, root, escape] = results(requests[1]);
  assert.doesNotMatch(search, /src\/lib/);
  assert.equal(read, 'src/lib/github.ts is excluded by the user\'s "don\'t read" settings.');
  assert.doesNotMatch(root, /src\//);
  assert.equal(escape, "Give a path inside the repo.");
  assert.match(requests[0].body.messages[0].content, /The user asked not to read: src\/\./);
});

test("picked branch is downloaded and used in links", async () => {
  const { post, calls } = setup({ replies: [toolTurn(["read_file", { path: "README.md" }]), endTurn("See README.md.")] });
  const res = await post({ repo: "o/r", question: "readme?", branch: "feat/x" });
  assert.deepEqual(calls.resolve, ["feat/x"]);
  assert.deepEqual(calls.tarball, ["feat/x"]);
  assert.equal(res.body.sources[0].url, "https://github.com/o/r/blob/feat%2Fx/README.md");
});

test("pull requests and issues", async () => {
  const { post, requests } = setup({
    replies: [toolTurn(["read_pull_request", { number: 3 }], ["read_issue", { number: 7 }], ["list_pull_requests", { state: "all" }]), endTurn("PR #3 adds the bot and fixes issue #7.")],
  });
  const res = await post({ repo: "o/r", question: "what does PR 3 do?" });
  const [pr, issue, list] = results(requests[1]);
  assert.match(pr, /#3 Add bot\nproud · proud\/bot → main · open/);
  assert.match(pr, /### src\/lib\/bot\.ts \(added, \+10 -0\)\n@@ \+1 @@\n\+export const BOT = 1;/);
  assert.match(pr, /trin on src\/lib\/bot\.ts:1: Looks good/);
  assert.match(issue, /#7 Login broken\nkin · open · \[bug\]/);
  assert.match(issue, /proud: Fixed in #3/);
  assert.match(list, /#3 Add bot · proud · proud\/bot → main · open/);
  assert.deepEqual(plain(res.body.sources.map((s) => s.path)), ["PR #3", "Issue #7"]);
});

test("own API key, workspace and URL; the key never shows in debug", async () => {
  const { post, requests } = setup({ key: "", replies: [endTurn("ok"), endTurn("ok")] });
  const res = await post({ repo: "o/r", question: "hi", model: "best", apiKey: "sk-ant-mine", workspaceId: "wrkspc_ABC", debug: true });
  assert.equal(res.status, 200);
  assert.equal(requests[0].headers["x-api-key"], "sk-ant-mine");
  assert.equal(requests[0].headers["anthropic-workspace-id"], "wrkspc_ABC");
  assert.doesNotMatch(JSON.stringify(res.body), /sk-ant-mine/);

  await post({ repo: "o/r", question: "hi", model: "best", apiKey: "sk-ant-mine", apiUrl: "https://proxy.example.com" });
  assert.equal(requests[1].url, "https://proxy.example.com/v1/messages");
  assert.equal(requests[1].body.fallbacks, undefined); // fallbacks only on Anthropic's own API

  const noKey = setup({ key: "", replies: [] });
  assert.equal((await noKey.post({ repo: "o/r", question: "hi" })).status, 503);
  assert.equal((await noKey.post({ repo: "o/r", question: "hi", apiUrl: "https://proxy.example.com" })).status, 400);
  assert.equal((await noKey.post({ repo: "o/r", question: "hi", apiKey: "sk-ant-mine", apiUrl: "http://localhost:1" })).status, 400);
});

test("server workspace ID only goes with the server key", async () => {
  const { post, requests } = setup({ workspace: "wrkspc_TEAM", replies: [endTurn("ok"), endTurn("ok")] });
  await post({ repo: "o/r", question: "x" });
  assert.equal(requests[0].headers["anthropic-workspace-id"], "wrkspc_TEAM");
  await post({ repo: "o/r", question: "x", apiKey: "sk-ant-mine" });
  assert.equal("anthropic-workspace-id" in requests[1].headers, false);
});

test("Claude errors come back with their message and the debug trace", async () => {
  const { post } = setup({ replies: [{ httpStatus: 401, message: "invalid x-api-key" }] });
  const res = await post({ repo: "o/r", question: "x", apiKey: "sk-ant-wrong", debug: true });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Claude API error (401): invalid x-api-key");
  assert.equal(res.body.debug.error, "Claude API error (401): invalid x-api-key");
});

test("last round forbids tools; unknown tools come back as errors", async () => {
  const replies = [toolTurn(["delete_file", {}])];
  for (let i = 0; i < 10; i++) replies.push(toolTurn(["list_folder", {}]));
  replies.push(endTurn("Done."));
  const { post, requests } = setup({ replies });
  const res = await post({ repo: "o/r", question: "hi" });
  assert.equal(res.body.answer, "Done.");
  assert.equal(requests.length, 12);
  assert.equal(requests[11].body.tool_choice.type, "none");
  assert.equal(requests[1].body.messages[2].content[0].is_error, true);
});

test("refusal, signed out and bad requests give clear replies", async () => {
  let r = await setup({ replies: [{ stop_reason: "refusal", content: [] }] }).post({ repo: "o/r", question: "x" });
  assert.equal(r.body.answer, "Sorry, I can't help with that one.");
  r = await setup({ replies: [], signedIn: false }).post({ repo: "o/r", question: "x" });
  assert.equal(r.status, 401);
  r = await setup({ replies: [] }).post({ repo: "o/r", question: "  " });
  assert.equal(r.status, 400);
});

test("chat lines are passed to get_chat_messages", async () => {
  const { post, requests } = setup({ replies: [toolTurn(["get_chat_messages", { since: "2026-10-16" }]), endTurn("Kin finished the builds.")] });
  await post({
    repo: "o/r",
    question: "summarize today's chat",
    chat: [
      { author: "Kin", text: "builds done", createdAt: "2026-10-16T02:00:00Z" },
      { author: "Old", text: "yesterday", createdAt: "2026-10-15T02:00:00Z" },
      { bad: true },
    ],
  });
  assert.equal(results(requests[1])[0], "[2026-10-16T02:00] Kin: builds done");
});

test("team-notes tools still work on COCOMMIT/", async () => {
  const { post, requests } = setup({ replies: [toolTurn(["find_entry", { keyword: "login" }], ["get_changes_since", { date: "2026-10-16" }]), endTurn("ok")] });
  await post({ repo: "o/r", question: "x" });
  const [entry, changes] = results(requests[1]);
  assert.equal(entry, "COCOMMIT/DECISIONS.md: ## 2026-10-15 · Use GitHub login");
  assert.match(changes, /- 2026-10-16 · Kin — desktop builds done/);
  assert.match(changes, /kin: Add login/);
});
