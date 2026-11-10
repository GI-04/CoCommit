import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// The desk on the Repository page (PLAN/2026-10-22-repo-page-magic.md): line changes for the sticky notes and the editor's
// marks, the edit diff, the step rail and the commit spines.
const load = (file) => {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const out = {};
  vm.runInNewContext(code, { exports: out, Math, Uint32Array });
  return out;
};
const d = load("../src/lib/desk.ts");
const { parsePatch } = load("../src/lib/diff.ts");
const plain = (v) => JSON.parse(JSON.stringify(v));

const before = ["import a", "", "function App() {", "  return 1", "}"].join("\n");
const after = ["import a", "import b", "", "function App() {", "  return 2", "}"].join("\n");

test("lineChanges counts added and removed lines and marks the new ones", () => {
  assert.deepEqual(plain(d.lineChanges(before, before)), { added: 0, removed: 0, marks: [] });
  assert.deepEqual(plain(d.lineChanges(before, after)), { added: 2, removed: 1, marks: [2, 5] });
  assert.deepEqual(plain(d.lineChanges("", "a\nb")), { added: 2, removed: 0, marks: [1, 2] });
  assert.deepEqual(plain(d.lineChanges("a\nb", "")), { added: 0, removed: 2, marks: [] });
  assert.deepEqual(plain(d.lineChanges("a\r\nb", "a\nb")), { added: 0, removed: 0, marks: [] }, "Windows line ends are not a change");
});

test("diffLines keeps line numbers on both sides", () => {
  const ops = plain(d.diffLines(before, after));
  assert.deepEqual(ops.map((o) => o.kind), ["ctx", "add", "ctx", "ctx", "del", "add", "ctx"]);
  assert.deepEqual(ops[4], { kind: "del", text: "  return 1", oldNo: 4 });
  assert.deepEqual(ops[6], { kind: "ctx", text: "}", oldNo: 5, newNo: 6 });
});

test("a huge middle is not compared line by line but still counts", () => {
  const big = (tag) => Array.from({ length: 2500 }, (_, i) => `${tag} ${i}`).join("\n");
  const r = d.lineChanges(`start\n${big("a")}\nend`, `start\n${big("b")}\nend`);
  assert.equal(r.added, 2500);
  assert.equal(r.removed, 2500);
});

test("editPatch is a unified diff that the diff panel can read", () => {
  assert.equal(d.editPatch(before, before), "");
  const patch = d.editPatch(before, after, 1);
  assert.match(patch, /^@@ -1,5 \+1,6 @@/);
  const rows = plain(parsePatch(patch));
  assert.equal(rows.filter((r) => r.kind === "add").length, 2);
  assert.deepEqual(rows.find((r) => r.kind === "del"), { kind: "del", text: "  return 1", oldNo: 4 });
  const far = Array.from({ length: 30 }, (_, i) => `l${i}`);
  const changed = [...far];
  changed[2] = "X";
  changed[27] = "Y";
  assert.equal(d.editPatch(far.join("\n"), changed.join("\n")).match(/^@@/gm).length, 2, "far-apart changes are separate hunks");
});

test("currentStep: pick, change, save, ask, done", () => {
  const s = { fileOpen: false, edits: 0, branchChanged: false, pullRequest: false };
  assert.equal(d.currentStep(s), 1);
  assert.equal(d.currentStep({ ...s, fileOpen: true }), 2);
  assert.equal(d.currentStep({ ...s, fileOpen: true, edits: 2 }), 3);
  assert.equal(d.currentStep({ ...s, branchChanged: true }), 4);
  assert.equal(d.currentStep({ ...s, branchChanged: true, pullRequest: true }), 5);
  assert.equal(d.currentStep({ ...s, branchChanged: true, pullRequest: true, edits: 1 }), 3, "new edits come back to saving");
});

test("note colours by file type; author colours and spine heights are stable", () => {
  assert.equal(d.noteTone("src/App.tsx"), "mustard");
  assert.equal(d.noteTone("src/index.css"), "pink");
  assert.equal(d.noteTone("package.json"), "cyan");
  assert.equal(d.noteTone("README.md"), "green");
  assert.equal(d.noteTone("logo.svg"), "clay");
  assert.equal(d.authorTone("Kin"), d.authorTone(" kin "));
  assert.ok(["pink", "cyan", "mustard", "green"].includes(d.authorTone("someone")));
  const h = d.spineHeight("2026-10-22T10:00:00Z Fix login");
  assert.equal(h, d.spineHeight("2026-10-22T10:00:00Z Fix login"));
  for (const seed of ["a", "b", "c", "d", "e", "f"]) {
    const x = d.spineHeight(seed);
    assert.ok(x >= 16 && x <= 46);
  }
  assert.equal(d.shortAgo("2h ago"), "2h");
  assert.equal(d.shortAgo("just now"), "now");
});
