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

test("isSharedPath allows files in folders up to 4 deep, nothing hidden or outside", () => {
  assert.ok(f.isSharedPath("COCOMMIT/files/a.png"));
  assert.ok(f.isSharedPath("COCOMMIT/files/sub/a.png"));
  assert.ok(f.isSharedPath("COCOMMIT/files/a/b/c/d/a.png"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/a/b/c/d/e/a.png"));
  assert.ok(!f.isSharedPath("COCOMMIT/CONTEXT.md"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/sub/"));
  assert.ok(!f.isSharedPath("COCOMMIT/files//a.png"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/../x"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/sub/../../x"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/.hidden"));
  assert.ok(!f.isSharedPath("COCOMMIT/files/sub/.keep"));
});

test("isMarkerPath is a .keep file in a folder, not at the top", () => {
  assert.ok(f.isMarkerPath("COCOMMIT/files/designs/.keep"));
  assert.ok(f.isMarkerPath("COCOMMIT/files/a/b/.keep"));
  assert.ok(!f.isMarkerPath("COCOMMIT/files/.keep"));
  assert.ok(!f.isMarkerPath("COCOMMIT/files/../.keep"));
  assert.ok(!f.isMarkerPath("COCOMMIT/files/a/b/c/d/e/.keep"));
});

test("cleanFolderName keeps one safe segment", () => {
  assert.equal(f.cleanFolderName("Designs 2026"), "Designs 2026");
  assert.equal(f.cleanFolderName("a/b"), "a b");
  assert.equal(f.cleanFolderName("../x"), "x");
  assert.equal(f.cleanFolderName(".git"), "git");
  assert.equal(f.cleanFolderName("  ///  "), "");
  assert.equal(f.cleanFolderName("logos / old!"), "logos old");
  assert.equal(f.cleanFolderName("v1.0."), "v1.0");
});

const file = (path, size = 1) => ({ ...f.splitShared(path), path, size });
const listing = {
  files: [file("COCOMMIT/files/a.png"), file("COCOMMIT/files/designs/logo.svg"), file("COCOMMIT/files/designs/old/v1.svg"), file("COCOMMIT/files/notes/x/y.txt")],
  markers: ["COCOMMIT/files/empty/.keep", "COCOMMIT/files/designs/.keep"],
};

test("splitShared and sharedPath go both ways", () => {
  assert.deepEqual({ ...f.splitShared("COCOMMIT/files/a/b.txt") }, { folder: "a", name: "b.txt" });
  assert.deepEqual({ ...f.splitShared("COCOMMIT/files/b.txt") }, { folder: "", name: "b.txt" });
  assert.equal(f.splitShared("README.md"), null);
  assert.equal(f.sharedPath("a/b", "c.txt"), "COCOMMIT/files/a/b/c.txt");
  assert.equal(f.sharedPath("", "c.txt"), "COCOMMIT/files/c.txt");
});

test("allFolders includes parents and empty folders", () => {
  assert.deepEqual([...f.allFolders(listing)], ["designs", "designs/old", "empty", "notes", "notes/x"]);
});

test("folderView shows direct subfolders and own files", () => {
  const top = f.folderView(listing, "");
  assert.deepEqual([...top.folders].map((x) => x.path), ["designs", "empty", "notes"]);
  assert.deepEqual([...top.files].map((x) => x.name), ["a.png"]);
  const designs = f.folderView(listing, "designs");
  assert.deepEqual([...designs.folders].map((x) => ({ ...x })), [{ name: "old", path: "designs/old" }]);
  assert.deepEqual([...designs.files].map((x) => x.name), ["logo.svg"]);
  assert.equal(f.folderView(listing, "empty").files.length, 0);
  // "design" must not match "designs"
  assert.deepEqual(f.folderView({ files: [file("COCOMMIT/files/designs/a/b.txt")], markers: [] }, "design").folders.length, 0);
});

test("pathsInFolder is everything a folder delete removes", () => {
  assert.deepEqual([...f.pathsInFolder(listing, "designs")].sort(), ["COCOMMIT/files/designs/.keep", "COCOMMIT/files/designs/logo.svg", "COCOMMIT/files/designs/old/v1.svg"]);
  assert.deepEqual([...f.pathsInFolder(listing, "empty")], ["COCOMMIT/files/empty/.keep"]);
  assert.deepEqual([...f.pathsInFolder(listing, "")], []);
});

test("crumbs", () => {
  assert.deepEqual(f.crumbs("").length, 0);
  assert.deepEqual([...f.crumbs("a/b")].map((c) => ({ ...c })), [{ name: "a", path: "a" }, { name: "b", path: "a/b" }]);
});

test("big files: 50 MB limit in 3 MB pieces", () => {
  assert.equal(f.MAX_FILE_BYTES, 50 * 1024 * 1024);
  assert.equal(f.MAX_PARTS, 17);
  assert.equal(f.partCount(0), 1);
  assert.equal(f.partCount(f.PART_BYTES), 1);
  assert.equal(f.partCount(f.PART_BYTES + 1), 2);
  assert.equal(f.partCount(f.MAX_FILE_BYTES), f.MAX_PARTS);
  // One piece in base64 inside the JSON body stays under Vercel's 4.5 MB request limit.
  assert.ok(Math.ceil(f.PART_BYTES / 3) * 4 + 200 < 4.5 * 1024 * 1024);
  // Joining 50 MB of pieces needs Vercel's full 300 s (a 25 MB join took ~30 s from a laptop).
  const route = readFileSync(new URL("../src/app/api/github/[action]/route.ts", import.meta.url), "utf8");
  assert.match(route, /^export const maxDuration = 300;$/m);
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
