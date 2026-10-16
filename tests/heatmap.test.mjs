import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Commit activity grid (PLAN/2026-10-16-heat-map.md).
const code = ts.transpileModule(readFileSync(new URL("../src/lib/heatmap.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const h = {};
vm.runInNewContext(code, { exports: h, Date, Math, Number, String, Map });

// Local times, so the tests pass in any time zone. Wed 2026-10-14, noon.
const now = new Date(2026, 9, 14, 12);
const at = (m, d, hh = 9) => new Date(2026, m - 1, d, hh).toISOString();
const cells = (map) => map.weeks.flat().filter(Boolean);

test("window is whole weeks, Sunday first, ending with this week", () => {
  const map = h.buildHeatMap([], 13, now);
  assert.equal(map.weeks.length, 13);
  assert.ok(map.weeks.every((w) => w.length === 7));
  assert.equal(map.weeks[0][0].date, "2026-07-19");
  assert.equal(map.start, "2026-07-19");
  const last = map.weeks[12];
  assert.equal(last[3].date, "2026-10-14"); // today (Wednesday)
  assert.equal(last[4], null); // Thursday onwards hasn't happened
  assert.equal(last[6], null);
});

test("counts commits per local day and per author", () => {
  const map = h.buildHeatMap(
    [
      { author: "ann", at: at(10, 14) },
      { author: "ann", at: at(10, 14, 20) },
      { author: "bo", at: at(10, 13) },
    ],
    13,
    now,
  );
  const byDate = Object.fromEntries(cells(map).map((c) => [c.date, c.count]));
  assert.equal(byDate["2026-10-14"], 2);
  assert.equal(byDate["2026-10-13"], 1);
  assert.equal(map.total, 3);
  assert.deepEqual([...map.authors], ["ann", "bo"]);
});

test("filtering by author keeps the full author list", () => {
  const commits = [
    { author: "ann", at: at(10, 14) },
    { author: "bo", at: at(10, 14) },
    { author: "bo", at: at(10, 12) },
  ];
  const map = h.buildHeatMap(commits, 13, now, "bo");
  assert.equal(map.total, 2);
  assert.deepEqual([...map.authors], ["bo", "ann"]);
});

test("ignores commits outside the window, in the future, or with a bad date", () => {
  const map = h.buildHeatMap(
    [
      { author: "ann", at: at(7, 18) }, // the day before the window
      { author: "ann", at: at(10, 20) }, // after today
      { author: "ann", at: "not a date" },
      { author: "ann", at: at(7, 19) }, // first day of the window
    ],
    13,
    now,
  );
  assert.equal(map.total, 1);
  assert.equal(map.weeks[0][0].count, 1);
});

test("levels: 0 for none, 1 to 4 scaled to the busiest day", () => {
  assert.equal(h.levelFor(0, 8), 0);
  assert.equal(h.levelFor(1, 8), 1);
  assert.equal(h.levelFor(4, 8), 2);
  assert.equal(h.levelFor(8, 8), 4);
  assert.equal(h.levelFor(3, 0), 0);
  const commits = Array.from({ length: 8 }, () => ({ author: "a", at: at(10, 14) })).concat({ author: "a", at: at(10, 13) });
  const map = h.buildHeatMap(commits, 13, now);
  const byDate = Object.fromEntries(cells(map).map((c) => [c.date, c.level]));
  assert.equal(byDate["2026-10-14"], 4);
  assert.equal(byDate["2026-10-13"], 1);
  assert.equal(byDate["2026-10-12"], 0);
});

test("empty input gives an empty but valid grid", () => {
  const map = h.buildHeatMap([], 4, now);
  assert.equal(map.total, 0);
  assert.deepEqual([...map.authors], []);
  assert.ok(cells(map).every((c) => c.level === 0));
});

test("commitsOnDay counts one local day and skips bad dates", () => {
  const list = [{ author: "a", at: at(10, 14) }, { author: "b", at: at(10, 14, 18) }, { author: "a", at: at(10, 13) }, { author: "a", at: "nope" }];
  assert.equal(h.commitsOnDay(list, "2026-10-14"), 2);
  assert.equal(h.commitsOnDay(list, "2026-10-12"), 0);
});

test("commitStreak counts days in a row back from today, or from yesterday if today is still empty", () => {
  const day = (d) => ({ author: "a", at: at(10, d) });
  assert.equal(h.commitStreak([], now), 0);
  assert.equal(h.commitStreak([day(14), day(13), day(12), day(10)], now), 3); // 10th is after a gap
  assert.equal(h.commitStreak([day(13), day(12)], now), 2); // nothing yet today: streak is still alive
  assert.equal(h.commitStreak([day(12)], now), 0); // yesterday had none either: streak ended
  assert.equal(h.commitStreak([day(14), day(14)], now), 1); // several commits in a day count once
});
