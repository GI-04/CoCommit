import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// src/lib/bot.ts has no imports, so it can run as-is after transpiling.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/bot.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const bot = {};
vm.runInNewContext(code, { exports: bot, URL });
// Arrays made inside the vm come from another realm; copy them before deepEqual.
const plain = (x) => JSON.parse(JSON.stringify(x));

const files = {
  "COCOMMIT/DECISIONS.md": "# Decisions\n\n## 2026-10-15 · Use GitHub login\nWe log in with GitHub OAuth.\n\n## 2026-10-14 · Tailwind\nStyling.",
  "COCOMMIT/GOTCHAS.md": "# Gotchas\n\n## Dev reload loop\nBrowser code imported github.ts.",
  "COCOMMIT/TODO.md": "# TODO\n\n- [ ] Email login form\n- [x] Chat names",
  "COCOMMIT/LOG.md": "# Log\n\n- 2026-10-16 · Kin — desktop builds done\n- 2026-10-15 · proud — chat pins merged\n- 2026-10-14 · Trin — layout",
  "COCOMMIT/HANDOFF.md": "# Handoff\nNext: wire the Context screen.",
  "COCOMMIT/COLLAB.md": "# Collab\n\n## Trin\n- **Role:** frontend\n\n## Kin\n- **Role:** desktop",
  "COCOMMIT/BOARD/Pending/2026-10-15-email-login.md": "# Task: Email login form\nTo: Trin",
  "COCOMMIT/BOARD/Pending/_TEMPLATE.md": "# Task: {{title}}\nTo: Trin",
  "COCOMMIT/BOARD/Done/2026-10-15-chat.md": "# Task: Chat backend\nOwner: Kin",
};

test("chat trigger", () => {
  assert.equal(bot.isBotMessage("@cocommit where is it?"), true);
  assert.equal(bot.isBotMessage("  @CoCommit: hi"), true);
  assert.equal(bot.isBotMessage("hello @cocommit"), false);
  assert.equal(bot.isBotMessage("@cocommitter"), false);
  assert.equal(bot.stripTrigger("@cocommit, สรุปสถานะทีม"), "สรุปสถานะทีม");
});

test("search ranks file-name hits first and skips non-matches", () => {
  const hits = bot.searchFiles(files, "login");
  assert.equal(hits[0].path, "COCOMMIT/BOARD/Pending/2026-10-15-email-login.md");
  assert.ok(hits.some((h) => h.path === "COCOMMIT/DECISIONS.md"));
  assert.ok(!hits.some((h) => h.path === "COCOMMIT/GOTCHAS.md"));
  assert.deepEqual(plain(bot.searchFiles(files, "zzz")), []);
});

test("search works with Thai text", () => {
  const hits = bot.searchFiles({ "COCOMMIT/TODO.md": "- ทำหน้าล็อกอิน" }, "ล็อกอิน");
  assert.equal(hits.length, 1);
});

test("snippet is centred on the hit", () => {
  const text = "a ".repeat(200) + "NEEDLE here " + "b ".repeat(200);
  const s = bot.makeSnippet(text, "needle", 60);
  assert.ok(s.includes("NEEDLE"));
  assert.ok(s.startsWith("…") && s.endsWith("…"));
  assert.equal(bot.makeSnippet("short text", "nothing"), "short text");
});

test("listFolder shows direct children only", () => {
  const paths = Object.keys(files);
  assert.deepEqual(plain(bot.listFolder(paths, "COCOMMIT/BOARD")), ["Done/", "Pending/"]);
  assert.deepEqual(plain(bot.listFolder(paths, "/COCOMMIT/BOARD/Pending/")), ["2026-10-15-email-login.md", "_TEMPLATE.md"]);
});

test("findEntries looks at headings and list items", () => {
  const found = bot.findEntries(files, "login");
  assert.deepEqual(plain(found.map((f) => f.path)), ["COCOMMIT/DECISIONS.md", "COCOMMIT/TODO.md"]);
  assert.deepEqual(plain(bot.findEntries(files, "  ")), []);
});

test("trimForSummary says how much was cut", () => {
  assert.equal(bot.trimForSummary("abc", 5), "abc");
  assert.match(bot.trimForSummary("abcdefgh", 5), /^abcde\n…\(cut: 3 more characters\)$/);
});

test("logSince keeps lines on or after the date", () => {
  const lines = bot.logSince(files["COCOMMIT/LOG.md"], "2026-10-15");
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes("Kin"));
});

test("overview has every part and skips the board template", () => {
  const o = bot.overview(files);
  for (const part of ["## HANDOFF.md", "## TODO.md", "## BOARD/Pending", "## LOG.md"]) assert.ok(o.includes(part));
  assert.ok(o.includes("Task: Email login form"));
  assert.ok(!o.includes("_TEMPLATE"));
});

test("memberWork finds the COLLAB section and board tasks", () => {
  const w = bot.memberWork(files, "trin");
  assert.ok(w.includes("**Role:** frontend"));
  assert.ok(w.includes("[Pending] Task: Email login form"));
  assert.ok(!w.includes("desktop"));
});

test("formatChat filters by time and keeps the newest when too long", () => {
  const lines = [
    { author: "A", text: "old", createdAt: "2026-10-14T10:00:00Z" },
    { author: "B", text: "new", createdAt: "2026-10-16T10:00:00Z" },
  ];
  assert.equal(bot.formatChat(lines, "2026-10-15"), "[2026-10-16T10:00] B: new");
  assert.match(bot.formatChat(lines, undefined, 30), /older messages cut\)\n\[2026-10-16T10:00\] B: new$/);
  assert.equal(bot.formatChat([], "2026-10-15"), "(no messages in that time)");
});

test("GitHub links encode each part of the path", () => {
  assert.equal(
    bot.toGithubLink("GI-04/CoCommit", "main", "COCOMMIT/BOARD/Pending/a b.md"),
    "https://github.com/GI-04/CoCommit/blob/main/COCOMMIT/BOARD/Pending/a%20b.md",
  );
});

test("shareText keeps links and stays under the chat limit", () => {
  const a = { answer: "x".repeat(5000), sources: [{ path: "COCOMMIT/TODO.md", url: "https://github.com/o/r/blob/main/COCOMMIT/TODO.md" }] };
  const s = bot.shareText("status?", a);
  assert.ok(s.length <= 4000);
  assert.ok(s.startsWith('🤖 @cocommit: "status?"\n'));
  assert.ok(s.endsWith("COCOMMIT/TODO.md"));
  assert.equal(bot.shareText("q", { answer: "hi", sources: [] }), '🤖 @cocommit: "q"\nhi');
});

test("tool list is complete and named", () => {
  assert.equal(bot.TOOLS.length, 15);
  for (const name of ["read_file", "search_files", "read_pull_request", "read_issue", "get_project_overview", "list_branches"]) assert.equal(bot.isToolName(name), true);
  assert.equal(bot.isToolName("delete_file"), false);
});

test("GitHub links can point at lines", () => {
  assert.equal(bot.toGithubLink("o/r", "feat/x", "src/a.ts", 10, 20), "https://github.com/o/r/blob/feat%2Fx/src/a.ts#L10-L20");
  assert.equal(bot.toGithubLink("o/r", "main", "src/a.ts", 7, 7), "https://github.com/o/r/blob/main/src/a.ts#L7");
});

test("don't-read patterns", () => {
  assert.deepEqual(plain(bot.parsePatterns("src-tauri/\n# note\n\n*.lock, notes.md")), ["src-tauri/", "*.lock", "notes.md"]);
  const ex = (path, ...p) => bot.isExcluded(path, p);
  assert.equal(ex("src-tauri/src/lib.rs", "src-tauri/"), true);
  assert.equal(ex("src/tauri.ts", "src-tauri/"), false);
  assert.equal(ex("package-lock.json", "*.json"), true);
  assert.equal(ex("src-tauri/Cargo.lock", "*.lock"), true);
  assert.equal(ex("docs/notes.md", "notes.md"), true);
  assert.equal(ex("src/lib/github.ts", "src/lib/github.ts"), true);
  assert.equal(ex("src/lib/github.ts", "src/**/*.ts"), true);
  assert.equal(ex("src/lib/github.ts", "src/lib"), true);
  assert.equal(ex("README.md", "src/"), false);
  assert.equal(ex("anything", ""), false);
});

test("numberLines pages with line numbers", () => {
  const text = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}`).join("\n");
  const first = bot.numberLines(text);
  assert.equal(first.from, 1);
  assert.equal(first.to, bot.PAGE_LINES);
  assert.equal(first.total, 1000);
  assert.ok(first.text.startsWith("  1| line 1"));
  const part = bot.numberLines(text, 995, 2000);
  assert.deepEqual([part.from, part.to], [995, 1000]);
  assert.ok(part.text.endsWith("1000| line 1000"));
  assert.deepEqual([bot.numberLines("a\nb", 9).from, bot.numberLines("a\nb", 9).to], [2, 2]);
});

test("grepRepo finds names and lines with every word", () => {
  const files = [
    { path: "src/lib/github.ts", text: "const TOKEN_COOKIE = 1;\nfunction seal(token) {}\n// cookie token sealed here" },
    { path: "src/cookie-banner.tsx", text: "export default 1" },
    { path: "public/app.dmg", text: null },
  ];
  const r = bot.grepRepo(files, "token cookie");
  assert.deepEqual(plain(r.names), []);
  assert.deepEqual(plain(r.hits.map((h) => `${h.path}:${h.line}`)), ["src/lib/github.ts:1", "src/lib/github.ts:3"]);
  assert.equal(r.filesWithHits, 1);
  assert.deepEqual(plain(bot.grepRepo(files, "cookie").names), ["src/cookie-banner.tsx"]);
  assert.equal(bot.grepRepo(files, " ").hits.length, 0);
});

test("pickModel keeps to the list unless a custom ID is valid", () => {
  assert.deepEqual(plain(bot.pickModel("fast")), { model: "claude-haiku-5-5", effort: "low", fallbacks: false });
  assert.deepEqual(plain(bot.pickModel("balanced")), { model: "claude-sonnet-5-5", effort: "medium", fallbacks: true });
  assert.deepEqual(plain(bot.pickModel("best")), { model: "claude-opus-5-5", effort: "medium", fallbacks: true });
  assert.equal(bot.pickModel("nonsense").model, "claude-haiku-5-5");
  assert.deepEqual(plain(bot.pickModel("custom", " claude-sonnet-5 ")), { model: "claude-sonnet-5", fallbacks: false });
  assert.equal(bot.pickModel("custom", "bad id; drop").model, "claude-haiku-5-5");
});

test("readApiUrl only allows public https hosts", () => {
  assert.equal(bot.readApiUrl("").url, null);
  assert.equal(bot.readApiUrl("https://proxy.example.com").url, "https://proxy.example.com/v1/messages");
  assert.equal(bot.readApiUrl("https://proxy.example.com/v1/").url, "https://proxy.example.com/v1/messages");
  assert.equal(bot.readApiUrl("https://proxy.example.com/anthropic/v1/messages").url, "https://proxy.example.com/anthropic/v1/messages");
  for (const bad of ["http://proxy.example.com", "https://localhost:8080", "https://169.254.169.254", "https://[::1]/", "https://box.local", "not a url"]) {
    assert.equal(typeof bot.readApiUrl(bad).error, "string", bad);
  }
});

test("applyEdit replaces one exact, unique piece", () => {
  assert.equal(bot.applyEdit("a b c", "b", "B").text, "a B c");
  assert.match(bot.applyEdit("a b c", "x", "y").error, /wasn't found/);
  assert.match(bot.applyEdit("b b b", "b", "y").error, /appears 3 times/);
  assert.match(bot.applyEdit("abc", "", "y").error, /old_text is empty/);
  assert.equal(bot.applyEdit("x = $1", "$1", "$&$&").text, "x = $&$&"); // no replace() pattern surprises
});

test("lineDiff shows changes with context", () => {
  const before = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
  const after = before.replace("line 10", "line ten").replace("line 20", "line 20\nline 21");
  const d = bot.lineDiff(before, after);
  assert.equal(d.additions, 2);
  assert.equal(d.deletions, 1);
  const text = d.lines.map((l) => `${l.kind}${l.text}`);
  assert.deepEqual(plain(text.slice(0, 9)), ["…", " line 7", " line 8", " line 9", "-line 10", "+line ten", " line 11", " line 12", " line 13"]);
  assert.equal(text.at(-1), "+line 21");
  assert.deepEqual(plain(bot.lineDiff(null, "a\nb").lines.map((l) => l.kind)), ["+", "+"]);
  assert.deepEqual(plain(bot.lineDiff("a", null).lines.map((l) => l.kind)), ["-"]);
});

test("assistantBranch makes a safe, unique branch name", () => {
  assert.equal(bot.assistantBranch("Fix login typo!", "ab12"), "assistant/fix-login-typo-ab12");
  assert.equal(bot.assistantBranch("แก้หน้า login", "ab12"), "assistant/login-ab12");
  assert.equal(bot.assistantBranch("แก้ไข", "ab12"), "assistant/changes-ab12");
  assert.match(bot.assistantBranch("x"), /^assistant\/x-[a-z0-9]{1,4}$/);
});

test("edit tools are separate from the read tools", () => {
  assert.deepEqual(plain(bot.EDIT_TOOLS.map((t) => t.name)), ["edit_file", "write_file", "delete_file", "show_changes"]);
  assert.equal(bot.isToolName("edit_file"), false);
  assert.equal(bot.isEditToolName("edit_file"), true);
});

test("readApiUrl for OpenAI-style APIs adds /chat/completions", () => {
  const gemini = "https://generativelanguage.googleapis.com/v1beta/openai";
  assert.equal(bot.readApiUrl(gemini, "openai").url, `${gemini}/chat/completions`);
  assert.equal(bot.readApiUrl(`${gemini}/`, "openai").url, `${gemini}/chat/completions`);
  assert.equal(bot.readApiUrl("https://api.openai.com/v1/chat/completions", "openai").url, "https://api.openai.com/v1/chat/completions");
  assert.equal(typeof bot.readApiUrl("http://api.openai.com/v1", "openai").error, "string");
  assert.equal(bot.readApiFormat("openai"), "openai");
  assert.equal(bot.readApiFormat("gemini"), "anthropic");
});

test("Messages API turns become Chat Completions messages and back", () => {
  const tools = plain(bot.toOpenAITools(bot.TOOLS));
  assert.equal(tools.length, bot.TOOLS.length);
  assert.deepEqual(tools[1], { type: "function", function: { name: "search_files", description: bot.TOOLS[1].description, parameters: plain(bot.TOOLS[1].input_schema) } });

  const msgs = plain(
    bot.toOpenAIMessages("SYS", [
      { role: "user", content: "where?" },
      { role: "assistant", content: [{ type: "thinking", thinking: "" }, { type: "text", text: "Looking." }, { type: "tool_use", id: "c1", name: "search_files", input: { query: "x" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "c1", content: "a.ts:1: x" }, { type: "tool_result", tool_use_id: "c2", content: "nope", is_error: true }] },
    ]),
  );
  assert.deepEqual(msgs, [
    { role: "system", content: "SYS" },
    { role: "user", content: "where?" },
    { role: "assistant", content: "Looking.", tool_calls: [{ id: "c1", type: "function", function: { name: "search_files", arguments: '{"query":"x"}' } }] },
    { role: "tool", tool_call_id: "c1", content: "a.ts:1: x" },
    { role: "tool", tool_call_id: "c2", content: "Error: nope" },
  ]);

  // Gemini says "stop" even when it calls tools; bad JSON arguments become {}.
  const calls = plain(
    bot.fromOpenAIResponse({
      choices: [{ finish_reason: "stop", message: { content: null, tool_calls: [{ id: "", type: "function", function: { name: "read_file", arguments: '{"path":"a.ts"}' } }, { id: "k", function: { name: "list_folder", arguments: "{bad" } }] } }],
      usage: { prompt_tokens: 30, completion_tokens: 4, prompt_tokens_details: { cached_tokens: 10 } },
    }),
  );
  assert.deepEqual(calls, {
    content: [{ type: "tool_use", id: "call_0", name: "read_file", input: { path: "a.ts" } }, { type: "tool_use", id: "k", name: "list_folder", input: {} }],
    stop_reason: "tool_use",
    usage: { input_tokens: 30, output_tokens: 4, cache_read_input_tokens: 10 },
  });
  assert.equal(bot.fromOpenAIResponse({ choices: [{ finish_reason: "length", message: { content: "cut" } }] }).stop_reason, "max_tokens");
  assert.equal(bot.fromOpenAIResponse({ choices: [{ finish_reason: "content_filter", message: {} }] }).stop_reason, "refusal");
  assert.equal(bot.fromOpenAIResponse({ choices: [{ finish_reason: "stop", message: { content: "Done." } }] }).stop_reason, "end_turn");
});
