import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Diff rows with line numbers for the Repository diff panel (PLAN/2026-10-16-figma-ui-polish.md).
const code = ts.transpileModule(readFileSync(new URL("../src/lib/diff.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const d = {};
vm.runInNewContext(code, { exports: d, Number, RegExp });

test("numbers old and new lines from the hunk header", () => {
  const rows = d.parsePatch("@@ -12,3 +12,4 @@ export function X\n a\n-b\n+c\n+d\n e");
  assert.equal(rows[0].kind, "hunk");
  const pick = (r) => `${r.kind}:${r.text}:${r.oldNo ?? "-"}:${r.newNo ?? "-"}`;
  assert.deepEqual([...rows.slice(1).map(pick)], ["ctx:a:12:12", "del:b:13:-", "add:c:-:13", "add:d:-:14", "ctx:e:14:15"]);
});

test("a second hunk restarts the numbers", () => {
  const rows = d.parsePatch("@@ -1 +1 @@\n-x\n+y\n@@ -40,2 +40,2 @@\n z\n-q\n+r");
  const second = rows.filter((r) => r.kind !== "hunk").slice(2);
  assert.equal(second[0].oldNo, 40);
  assert.equal(second[1].oldNo, 41);
  assert.equal(second[2].newNo, 41);
});

test("git diff headers before the first hunk are meta; content like '--- x' inside a hunk is a removal", () => {
  const rows = d.parsePatch("diff --git a/f b/f\n--- a/f\n+++ b/f\n@@ -1,2 +1,1 @@\n--- x\n keep");
  assert.deepEqual([...rows.map((r) => r.kind)], ["meta", "meta", "meta", "hunk", "del", "ctx"]);
  assert.equal(rows[4].text, "-- x");
});

test("'\\ No newline' notes are meta and take no line number; empty patches give no rows; CRLF end is trimmed", () => {
  const rows = d.parsePatch("@@ -1 +1 @@\n-a\n\\ No newline at end of file\n+b\r\n");
  assert.deepEqual([...rows.map((r) => r.kind)], ["hunk", "del", "meta", "add"]);
  assert.equal(rows[3].newNo, 1);
  assert.equal(d.parsePatch("").length, 0);
  assert.equal(d.parsePatch("  \n").length, 0);
});
