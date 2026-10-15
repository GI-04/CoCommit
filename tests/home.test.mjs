import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Home screen helpers (PLAN/2026-10-16-figma-ui.md): card layout for "Customize" and short times.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/home.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const h = {};
vm.runInNewContext(code, { exports: h, Date, Math, Number, String, Array, Object, Set, isNaN });

const ALL = ["repo", "chat", "board", "files"];

test("no saved layout shows every card in the default order", () => {
  for (const saved of [null, undefined, "x", 5, [], {}]) {
    const l = h.resolveLayout(ALL, saved);
    assert.deepEqual([...l.order], ALL);
    assert.deepEqual([...l.hidden], []);
  }
});

test("a saved layout keeps order and hidden cards, drops unknown and duplicate ids, appends new cards", () => {
  const l = h.resolveLayout(ALL, { order: ["files", "gone", "repo", "files"], hidden: ["repo", "gone", "repo", 7] });
  assert.deepEqual([...l.order], ["files", "repo", "chat", "board"]);
  assert.deepEqual([...l.hidden], ["repo"]);
});

test("moveCard swaps neighbours and stops at the ends", () => {
  const l = h.resolveLayout(ALL, null);
  assert.deepEqual([...h.moveCard(l, "chat", -1).order], ["chat", "repo", "board", "files"]);
  assert.deepEqual([...h.moveCard(l, "repo", 1).order], ["chat", "repo", "board", "files"]);
  assert.equal(h.moveCard(l, "repo", -1), l);
  assert.equal(h.moveCard(l, "files", 1), l);
  assert.equal(h.moveCard(l, "nope", 1), l);
});

test("toggleCard hides then shows again, and visibleCards skips hidden ones", () => {
  let l = h.resolveLayout(ALL, null);
  l = h.toggleCard(l, "chat");
  assert.deepEqual([...l.hidden], ["chat"]);
  assert.deepEqual([...h.visibleCards(l)], ["repo", "board", "files"]);
  l = h.toggleCard(l, "chat");
  assert.deepEqual([...l.hidden], []);
  assert.equal(h.toggleCard(l, "nope"), l);
});

test("timeAgo", () => {
  const now = new Date(2026, 9, 14, 12, 0, 0);
  const ago = (ms) => new Date(now.getTime() - ms).toISOString();
  assert.equal(h.timeAgo(ago(20_000), now), "just now");
  assert.equal(h.timeAgo(ago(5 * 60_000), now), "5m ago");
  assert.equal(h.timeAgo(ago(3 * 3_600_000), now), "3h ago");
  assert.equal(h.timeAgo(ago(2 * 86_400_000), now), "2d ago");
  assert.match(h.timeAgo(ago(30 * 86_400_000), now), /^[A-Z][a-z]{2} \d{1,2}$/);
  assert.equal(h.timeAgo("garbage", now), "");
  assert.equal(h.timeAgo(ago(-60_000), now), "just now"); // a clock a little ahead of ours
});
