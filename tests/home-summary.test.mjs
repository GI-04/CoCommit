import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Summaries on Home's shortcut cards (PLAN/2026-10-16-glass-buttons-spines.md, item 4): short times, plain text, next step.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/home-summary.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const h = {};
vm.runInNewContext(code, { exports: h, Date, Math, Number, String, Array, Object, Set, RegExp, isNaN });

const now = new Date(2026, 9, 14, 12, 0, 0);
const ago = (ms) => new Date(now.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

test("relativeTime", () => {
  assert.equal(h.relativeTime(ago(20_000), now), "just now");
  assert.equal(h.relativeTime(ago(59_999), now), "just now");
  assert.equal(h.relativeTime(ago(MIN), now), "1 min ago");
  assert.equal(h.relativeTime(ago(5 * MIN), now), "5 min ago");
  assert.equal(h.relativeTime(ago(59 * MIN), now), "59 min ago");
  assert.equal(h.relativeTime(ago(60 * MIN), now), "1h ago");
  assert.equal(h.relativeTime(ago(2 * HOUR + 30 * MIN), now), "2h ago");
  assert.equal(h.relativeTime(ago(23 * HOUR + 59 * MIN), now), "23h ago");
  assert.equal(h.relativeTime(ago(DAY), now), "1 day ago");
  assert.equal(h.relativeTime(ago(3 * DAY), now), "3 days ago");
  assert.equal(h.relativeTime(ago(29 * DAY), now), "29 days ago");
  assert.match(h.relativeTime(ago(45 * DAY), now), /^[A-Z][a-z]{2} \d{1,2}$/);
  assert.match(h.relativeTime(ago(400 * DAY), now), /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  assert.equal(h.relativeTime("garbage", now), "");
  assert.equal(h.relativeTime("", now), "");
  assert.equal(h.relativeTime(ago(-5 * MIN), now), "just now"); // a clock a little ahead of ours
});

test("firstLine takes the first line that has something on it", () => {
  assert.equal(h.firstLine("Fix login\n\nLonger story"), "Fix login");
  assert.equal(h.firstLine("\n  \n  Fix login  \r\nmore"), "Fix login");
  assert.equal(h.firstLine(""), "");
  assert.equal(h.firstLine("   \n\n"), "");
  assert.equal(h.firstLine(undefined), "");
});

test("truncate cuts with an ellipsis and keeps short text as it is", () => {
  assert.equal(h.truncate("short", 10), "short");
  assert.equal(h.truncate("exactly10!", 10), "exactly10!");
  assert.equal(h.truncate("a long sentence here", 10), "a long se…");
  assert.equal(h.truncate("a  b\nc", 10), "a b c");
  assert.equal(h.truncate("word    ", 5), "word");
  assert.equal(h.truncate("hello world", 7), "hello…"); // no space left dangling before the ellipsis
  assert.equal(h.truncate("😀😀😀😀😀😀", 4), "😀😀😀…"); // never cuts an emoji in half
  assert.equal(h.truncate("", 5), "");
});

test("stripMarkdown removes marks but keeps the words", () => {
  assert.equal(h.stripMarkdown("- Ask Pattadon to run the SQL"), "Ask Pattadon to run the SQL");
  assert.equal(h.stripMarkdown("* item"), "item");
  assert.equal(h.stripMarkdown("2. Second thing"), "Second thing");
  assert.equal(h.stripMarkdown("10) Tenth"), "Tenth");
  assert.equal(h.stripMarkdown("- [ ] review PR"), "review PR");
  assert.equal(h.stripMarkdown("- [x] done already"), "done already");
  assert.equal(h.stripMarkdown("> quoted words"), "quoted words");
  assert.equal(h.stripMarkdown("### A heading"), "A heading");
  assert.equal(h.stripMarkdown("Run **the tests** first"), "Run the tests first");
  assert.equal(h.stripMarkdown("Run __the tests__ first"), "Run the tests first");
  assert.equal(h.stripMarkdown("Open `npm run build` now"), "Open npm run build now");
  assert.equal(h.stripMarkdown("Read [the plan](PLAN/x.md) today"), "Read the plan today");
  assert.equal(h.stripMarkdown("See ![shot](a.png) here"), "See shot here");
  assert.equal(h.stripMarkdown("See [the plan][p] here"), "See the plan here");
  assert.equal(h.stripMarkdown("Visit <https://cocommit.vercel.app> soon"), "Visit https://cocommit.vercel.app soon");
  assert.equal(h.stripMarkdown("This is *really* it and _that_ too"), "This is really it and that too");
  assert.equal(h.stripMarkdown("~~old~~ new"), "old new");
  assert.equal(h.stripMarkdown("- **Next:** merge PR #42"), "Next: merge PR #42");
  assert.equal(h.stripMarkdown("keep snake_case_name and 2 * 3 * 4"), "keep snake_case_name and 2 * 3 * 4");
  assert.equal(h.stripMarkdown("   spaced   out   "), "spaced out");
  assert.equal(h.stripMarkdown(""), "");
});

test("nextStepLine finds the heading with 'next step' and takes its first line", () => {
  const md = [
    "# Handoff",
    "",
    "## Current state",
    "Things work.",
    "",
    "## Exact next step",
    "",
    "1. **Pattadon:** run `supabase/chat-privacy.sql`, then [check](scripts/check.mjs).",
    "2. Second item",
  ].join("\n");
  assert.equal(h.nextStepLine(md), "Pattadon: run supabase/chat-privacy.sql, then check.");
});

test("nextStepLine matches any heading level, any case, and the plural", () => {
  assert.equal(h.nextStepLine("# Notes\n\n### NEXT STEPS\n- Do the thing\n"), "Do the thing");
  assert.equal(h.nextStepLine("## next step: demo\nRehearse."), "Rehearse.");
  assert.equal(h.nextStepLine("## Exact Next Step\r\nWindows line ends\r\n"), "Windows line ends");
});

test("nextStepLine stops at the next heading and tries a later matching one", () => {
  assert.equal(h.nextStepLine("## Next step\n\n## Other\ntext"), null);
  assert.equal(h.nextStepLine("## Next step\n\n## Other\ntext\n\n## Next steps (old)\nThe old plan"), "The old plan");
});

test("nextStepLine skips comments and gives null without a matching heading", () => {
  assert.equal(h.nextStepLine("## Next step\n<!-- fill in -->\n<!--\nmulti\nline\n-->\nReal step"), "Real step");
  assert.equal(h.nextStepLine("# Handoff\n\nNext step: do it\n## Current state\nfine"), null); // not a heading
  assert.equal(h.nextStepLine("## Current state\nfine"), null);
  assert.equal(h.nextStepLine(""), null);
  assert.equal(h.nextStepLine(undefined), null);
});

test("chatText is one line without links or a dangling dot", () => {
  assert.equal(h.chatText("hello\nthere  team"), "hello there team");
  assert.equal(h.chatText("committed “Fix login” to main · https://github.com/a/b/commit/abc"), "committed “Fix login” to main");
  assert.equal(h.chatText("see https://x.dev/a?b=1 for more"), "see for more");
  assert.equal(h.chatText("https://x.dev/only-a-link"), "");
});

test("commitSummary: message first line, then who and when", () => {
  const c = { author: "alice", text: "Fix the login bug\n\nlong body", at: ago(2 * HOUR) };
  assert.deepEqual([...h.commitSummary(c, now)], ["Fix the login bug", "alice · 2h ago"]);
  assert.deepEqual([...h.commitSummary({ ...c, at: "garbage" }, now)], ["Fix the login bug", "alice"]);
  assert.deepEqual([...h.commitSummary({ ...c, author: "" }, now)], ["Fix the login bug", "2h ago"]);
  assert.deepEqual([...h.commitSummary({ ...c, author: "", at: "x" }, now)], ["Fix the login bug"]);
  assert.deepEqual([...h.commitSummary({ ...c, text: "  \n " }, now)], []);
  const long = h.commitSummary({ ...c, text: "x".repeat(500) }, now)[0];
  assert.ok(long.length <= 140 && long.endsWith("…"));
});

test("chatSummary: the last two lines as name: text", () => {
  const m = (author, text) => ({ author, text });
  assert.deepEqual([...h.chatSummary([m("Ann", "hi"), m("Bob", "hello"), m("Cy", "yo")])], ["Bob: hello", "Cy: yo"]);
  assert.deepEqual([...h.chatSummary([m("Ann", "only one")])], ["Ann: only one"]);
  assert.deepEqual([...h.chatSummary([])], []);
  assert.deepEqual([...h.chatSummary([m("Ann", "a\nb"), m("", "no name")])], ["Ann: a b", "no name"]);
  assert.deepEqual([...h.chatSummary([m("Ann", "hi"), m("Git", "https://x.dev/a")])], ["Ann: hi"]); // a link-only line has no text
  assert.deepEqual([...h.chatSummary([m("A", "1"), m("B", "2"), m("C", "3")], 3)], ["A: 1", "B: 2", "C: 3"]);
});

test("contextSummary", () => {
  assert.deepEqual([...h.contextSummary("Run the SQL")], ["Next: Run the SQL"]);
  assert.deepEqual([...h.contextSummary(null)], []);
  assert.deepEqual([...h.contextSummary("  ")], []);
  const long = h.contextSummary("y ".repeat(300))[0];
  assert.ok(long.startsWith("Next: ") && long.length <= 140 && long.endsWith("…"));
});

test("driveSummary: three file names, then how many more", () => {
  const f = (...names) => names.map((name) => ({ name }));
  assert.deepEqual([...h.driveSummary(f("a.pdf", "b.png"))], ["a.pdf, b.png"]);
  assert.deepEqual([...h.driveSummary(f("a.pdf", "b.png", "c.txt"))], ["a.pdf, b.png, c.txt"]);
  assert.deepEqual([...h.driveSummary(f("a", "b", "c", "d", "e"))], ["a, b, c", "+2 more"]);
  assert.deepEqual([...h.driveSummary([])], []);
});

test("nextStepLine skips code fences, tables, rules and HTML under the heading", () => {
  assert.equal(h.nextStepLine("## Next step\n```bash\nnpm test\n```\n"), "npm test");
  assert.equal(h.nextStepLine("## Next step\n| who | what |\n|---|---|\n---\n***\n<details>\nShip it"), "Ship it");
  assert.equal(h.nextStepLine("## Next step\n~~~\n~~~\nAfter the fence"), "After the fence");
});

test("nextStepLine reads on into sub-headings but not into the next section, and ignores a heading inside code", () => {
  assert.equal(h.nextStepLine("## Next steps\n### Now\n1. Do the thing\n## Later\nx"), "Do the thing");
  assert.equal(h.nextStepLine("## Next step\n### Now\n## Later\nx"), null);
  assert.equal(h.nextStepLine("```md\n## Next step\nnot real\n```\n"), null);
  assert.equal(h.nextStepLine("# Handoff\n## Next step\nreal\n"), "real");
});

test("contextSummary drops a leading Next label instead of repeating it", () => {
  assert.deepEqual([...h.contextSummary("Next: ship it")], ["Next: ship it"]);
  assert.deepEqual([...h.contextSummary("Next step - ship it")], ["Next: ship it"]);
  assert.deepEqual([...h.contextSummary("Nextcloud is down")], ["Next: Nextcloud is down"]);
});

test("stripMarkdown keeps dunder names, caps a huge line, and still removes __bold text__", () => {
  assert.equal(h.stripMarkdown("call __init__ and __main__ first"), "call __init__ and __main__ first");
  assert.equal(h.stripMarkdown("a __bold text__ here"), "a bold text here");
  const t0 = Date.now();
  assert.ok(h.stripMarkdown("*a ".repeat(20000)).length <= 500);
  assert.ok(Date.now() - t0 < 500, "a huge line must not freeze the page");
});

test("chatText removes a link with its brackets and a trailing colon", () => {
  assert.equal(h.chatText("see (https://x.y/z) now"), "see now");
  assert.equal(h.chatText("details: https://x.y/z"), "details");
  assert.equal(h.chatText("committed “a” · https://g.com/x"), "committed “a”");
});

test("relativeTime gives nothing for the epoch (a missing date) and commitSummary then shows only who", () => {
  assert.equal(h.relativeTime("1970-01-01T00:00:00.000Z", now), "");
  assert.deepEqual([...h.commitSummary({ author: "Kin", text: "Fix it", at: "1970-01-01T00:00:00.000Z" }, now)], ["Fix it", "Kin"]);
});

test("driveSummary puts top-folder files first and names the folder of the others; it does not claim newest", () => {
  const files = [{ name: "logo.png", folder: "designs" }, { name: "a.md", folder: "" }, { name: "b.md", folder: "" }, { name: "c.md", folder: "" }];
  assert.deepEqual([...h.driveSummary(files)], ["a.md, b.md, c.md", "+1 more"]);
  assert.deepEqual([...h.driveSummary(files.slice(0, 2))], ["designs/logo.png, a.md"].map(() => "a.md, designs/logo.png"));
});
