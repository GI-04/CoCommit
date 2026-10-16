import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Folder view of the Repo page's file list. Pure, no network.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/file-tree.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(code, { exports });
const { treeRows, parentFolders } = exports;
const show = (rows) => Array.from(rows).map((r) => `${"  ".repeat(r.depth)}${r.kind === "folder" ? r.name + "/" : r.name}`);
const paths = ["README.md", "src/app/page.tsx", "src/app/login/page.tsx", "src/lib/a.ts", "COCOMMIT/files/x.png", "b.txt"];

test("folders start collapsed: folders first, then files, sorted", () => {
  assert.deepEqual(show(treeRows(paths, new Set())), ["COCOMMIT/", "src/", "b.txt", "README.md"]);
});

test("an expanded folder shows its contents, subfolders before files", () => {
  assert.deepEqual(show(treeRows(paths, new Set(["src", "src/app"]))), [
    "COCOMMIT/",
    "src/",
    "  app/",
    "    login/",
    "    page.tsx",
    "  lib/",
    "b.txt",
    "README.md",
  ]);
});

test("rows carry the full path", () => {
  const rows = treeRows(paths, new Set(["src", "src/app", "src/app/login"]));
  assert.ok(rows.some((r) => r.kind === "file" && r.path === "src/app/login/page.tsx"));
});

test("parentFolders lists folders outermost first", () => {
  assert.deepEqual(Array.from(parentFolders("a/b/c.txt")), ["a", "a/b"]);
  assert.deepEqual(Array.from(parentFolders("c.txt")), []);
});
