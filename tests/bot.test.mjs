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
vm.runInNewContext(code, { exports: bot });
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
  assert.equal(bot.TOOLS.length, 9);
  assert.equal(bot.isToolName("read_file"), true);
  assert.equal(bot.isToolName("delete_file"), false);
});
