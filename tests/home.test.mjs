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

test("moveCardTo drops a card on a place: it takes that place and the cards between shift", () => {
  const l = h.resolveLayout(ALL, { hidden: ["chat"] });
  assert.deepEqual([...h.moveCardTo(l, "repo", 2).order], ["chat", "board", "repo", "files"]); // forward: the card ends up after the one it was dropped on
  assert.deepEqual([...h.moveCardTo(l, "files", 1).order], ["repo", "files", "chat", "board"]); // backward: the card takes the place and the dropped-on one shifts right
  assert.deepEqual([...h.moveCardTo(l, "board", 0).order], ["board", "repo", "chat", "files"]);
  assert.deepEqual([...h.moveCardTo(l, "repo", 3).order], ["chat", "board", "files", "repo"]);
  assert.deepEqual([...h.moveCardTo(l, "repo", 2).hidden], ["chat"], "hidden cards stay hidden");
});

test("moveCardTo changes nothing for the same place, an unknown card or a bad place; an out-of-range place is the end", () => {
  const l = h.resolveLayout(ALL, null);
  assert.equal(h.moveCardTo(l, "chat", 1), l);
  assert.equal(h.moveCardTo(l, "nope", 0), l);
  assert.equal(h.moveCardTo(l, "chat", NaN), l);
  assert.equal(h.moveCardTo(l, "chat", Infinity), l);
  assert.deepEqual([...h.moveCardTo(l, "repo", 99).order], ["chat", "board", "files", "repo"]);
  assert.deepEqual([...h.moveCardTo(l, "files", -5).order], ["files", "repo", "chat", "board"]);
  assert.deepEqual([...h.moveCardTo(l, "chat", 2.9).order], ["repo", "board", "chat", "files"]);
  assert.deepEqual([...l.order], ALL, "the layout it was given is not changed");
});

test("cardAt finds the card under the pointer, skips the dragged one and counts the gap between cards", () => {
  const r = (id, left, top, right, bottom) => ({ id, left, top, right, bottom });
  const rects = [r("a", 0, 0, 100, 100), r("b", 120, 0, 220, 100), r("wide", 0, 120, 220, 220)];
  assert.equal(h.cardAt(rects, 50, 50), "a");
  assert.equal(h.cardAt(rects, 150, 50), "b");
  assert.equal(h.cardAt(rects, 50, 50, "a"), null, "the dragged card is never its own target");
  assert.equal(h.cardAt(rects, 110, 50), "a", "in the gap: the closer card wins (a's centre is 60 away, b's 60 away: first wins a tie)");
  assert.equal(h.cardAt(rects, 116, 50), "b");
  assert.equal(h.cardAt(rects, 110, 110), "wide", "gap corner, three cards in reach: the closest centre (the wide card) wins");
  assert.equal(h.cardAt(rects, 500, 500), null);
  assert.equal(h.cardAt(rects, 50, 50, undefined, 0), "a");
  assert.equal(h.cardAt(rects, 110, 50, undefined, 0), null, "no grace: the gap is nothing");
  assert.equal(h.cardAt([], 1, 1), null);
});

test("autoScrollStep scrolls near the edges, faster closer in, and never past the top or the limit", () => {
  const f = (y, scrollY, maxY) => h.autoScrollStep(y, 800, scrollY, maxY);
  assert.equal(f(400, 100, 500), 0, "the middle of the window: no scrolling");
  assert.equal(f(799, 100, 500) > 17, true, "the very bottom: nearly full speed down");
  assert.ok(f(760, 100, 500) > 0 && f(760, 100, 500) < f(790, 100, 500), "closer to the edge is faster");
  assert.ok(f(5, 100, 500) < -16, "the very top: nearly full speed up");
  assert.equal(f(799, 495, 500), 5, "only what is left before the limit");
  assert.equal(f(799, 500, 500), 0, "at the limit: stop (a lifted card must not make the page run on)");
  assert.equal(f(799, 900, 500), 0, "past the limit: never scroll further");
  assert.equal(f(5, 0, 500), 0, "at the top: nothing to scroll");
  assert.equal(f(5, 6, 500), -6, "only what is left to the top");
  assert.equal(f(799, 0, 0), 0, "a page that does not scroll");
});
