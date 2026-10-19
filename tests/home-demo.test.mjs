import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Home's demo team, shown signed out (PLAN/2026-10-18-home-ux-fixes.md). Its imports are types only, so it runs alone.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/home-demo.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const d = {};
vm.runInNewContext(code, { exports: d, Date });

const DAY = 86_400_000;
const localDay = (iso) => new Date(iso).toDateString();

for (const now of [new Date(2026, 9, 18, 15, 30), new Date(2026, 9, 18, 0, 5), new Date(2027, 0, 1, 23, 59)]) {
  test(`demo commits look current and never sit in the future (${now.toString().slice(0, 21)})`, () => {
    const commits = d.demoCommits(now);
    assert.ok(commits.length > 100);
    for (const c of commits) {
      const at = Date.parse(c.at);
      assert.ok(at <= now.getTime(), `${c.at} is after now`);
      assert.ok(now.getTime() - at < 92 * DAY, `${c.at} is older than 13 weeks`);
      assert.ok(c.author);
    }
    // Something every one of the last 5 days, so Today and Streak show a number above 0.
    for (let back = 0; back < 5; back++) {
      const day = new Date(now.getTime() - back * DAY).toDateString();
      assert.ok(commits.some((c) => localDay(c.at) === day), `no commit ${back} days ago`);
    }
  });

  test(`demo activity is newest first and in the past (${now.toString().slice(0, 21)})`, () => {
    const items = d.demoActivity(now);
    assert.ok(items.length >= 5);
    const times = items.map((a) => Date.parse(a.at));
    assert.deepEqual([...times], [...times].sort((a, b) => b - a));
    assert.ok(times.every((t) => t < now.getTime()));
  });
}

test("demo board has tasks in every column and a team", () => {
  const board = d.demoBoard("GI-04/CoCommit");
  assert.equal(board.repo, "GI-04/CoCommit");
  for (const status of ["pending", "taken", "done"]) assert.ok(board.tasks.some((t) => t.status === status), status);
  assert.ok(board.tasks.filter((t) => t.status === "taken").every((t) => t.owner));
  assert.equal(new Set(board.tasks.map((t) => t.path)).size, board.tasks.length);
  assert.ok(board.members.length >= 3);
});
