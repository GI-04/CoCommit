import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// File modes kept on commit (PLAN/2026-10-16-demo-polish-kin.md, item 2). Pure helper, no network.
function load(file) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/lib/${file}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({}) });
  return exports;
}
const m = load("git-modes");

// A branch as GitHub's recursive tree listing returns it.
const listing = [
  { path: "README.md", mode: "100644", type: "blob" },
  { path: "scripts", mode: "040000", type: "tree" },
  { path: "scripts/deploy.sh", mode: "100755", type: "blob" },
  { path: "docs/latest", mode: "120000", type: "blob" },
  { path: "vendor/lib", mode: "160000", type: "commit" },
];
const modes = m.modesByPath(listing);

test("an edited executable stays executable", () => {
  const [e] = m.treeEntries([{ path: "scripts/deploy.sh", content: "#!/bin/sh\necho hi\n" }], modes);
  assert.deepEqual({ ...e }, { path: "scripts/deploy.sh", mode: "100755", type: "blob", content: "#!/bin/sh\necho hi\n" });
});

test("an edited plain file and a new file are plain (100644)", () => {
  const out = m.treeEntries([{ path: "README.md", content: "x" }, { path: "new/file.ts", content: "y" }], modes);
  assert.deepEqual(out.map((e) => e.mode), ["100644", "100644"]);
});

test("deleting keeps the file's own mode", () => {
  const out = m.treeEntries([{ path: "scripts/deploy.sh", content: null }, { path: "README.md", content: null }], modes);
  assert.deepEqual(out.map((e) => ({ ...e })), [
    { path: "scripts/deploy.sh", mode: "100755", type: "blob", sha: null },
    { path: "README.md", mode: "100644", type: "blob", sha: null },
  ]);
});

test("symlinks and submodules are refused, never overwritten as plain files", () => {
  assert.throws(() => m.treeEntries([{ path: "docs/latest", content: "oops" }], modes), (e) => e.name === "GitModeError" && /symlink/.test(e.message));
  assert.throws(() => m.treeEntries([{ path: "vendor/lib", content: null }], modes), (e) => e.name === "GitModeError" && /submodule/.test(e.message));
  // A refusal stops the whole commit: no partial list comes back.
  assert.throws(() => m.treeEntries([{ path: "README.md", content: "ok" }, { path: "docs/latest", content: "x" }], modes));
});

test("a truncated listing falls back to a plain file for paths it didn't list", () => {
  const partial = m.modesByPath(listing.slice(0, 1)); // GitHub stopped early: deploy.sh missing
  const [e] = m.treeEntries([{ path: "scripts/deploy.sh", content: "x" }], partial);
  assert.equal(e.mode, "100644");
});

test("folders in the listing are ignored", () => {
  assert.equal(modes.has("scripts"), false);
  assert.equal(modes.get("scripts/deploy.sh"), "100755");
});
