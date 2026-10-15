import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Shared files helpers (PLAN/2026-10-16-files.md). Pure, no network.
function load(file) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/lib/${file}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({}) });
  return exports;
}
const f = load("files-util");
const m = load("git-modes");

test("cleanName keeps normal names and strips folders and odd characters", () => {
  assert.equal(f.cleanName("report.pdf"), "report.pdf");
  assert.equal(f.cleanName("../../etc/passwd"), "passwd");
  assert.equal(f.cleanName("C:\\Users\\me\\My Photo!.PNG"), "My Photo-.PNG");
  assert.equal(f.cleanName(".env"), "env");
  assert.equal(f.cleanName(""), "file");
  assert.equal(f.cleanName("..."), "file");
});

test("uniqueName adds (2), (3) before the extension", () => {
  assert.equal(f.uniqueName("a.png", ["b.png"]), "a.png");
  assert.equal(f.uniqueName("a.png", ["A.PNG"]), "a (2).png");
  assert.equal(f.uniqueName("a.png", ["a.png", "a (2).png"]), "a (3).png");
  assert.equal(f.uniqueName("notes", ["notes"]), "notes (2)");
});

test("isSharedPath only allows files directly in COCOMMIT/files", () => {
  assert.ok(f.isSharedPath("COCOMMIT/files/a.png"));
  assert.ok(!f.isSharedPath("COCOMMIT/CONTEXT.md"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/sub/a.png"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/../x"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/.hidden"));
});

test("formatSize", () => {
  assert.equal(f.formatSize(12), "12 B");
  assert.equal(f.formatSize(3500), "3.4 KB");
  assert.equal(f.formatSize(3 * 1024 * 1024), "3.0 MB");
});

test("a binary file's tree entry points at its uploaded blob", () => {
  const [e] = m.treeEntries([{ path: "COCOMMIT/files/a.png", content: "AAAA", encoding: "base64" }], new Map(), new Map([["COCOMMIT/files/a.png", "abc123"]]));
  assert.deepEqual({ ...e }, { path: "COCOMMIT/files/a.png", mode: "100644", type: "blob", sha: "abc123" });
});
