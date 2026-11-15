import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// The index drawer on the Repository page (PLAN/2026-10-22-repo-page-magic.md): folder layers, tabs, colours, filters.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/drawer.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const d = {};
vm.runInNewContext(code, { exports: d, Math });
const plain = (v) => JSON.parse(JSON.stringify(v));

const paths = ["README.md", "package.json", "src/App.tsx", "src/index.css", "src/components/Nav.tsx", "src/components/ui/Button.tsx", "docs/guide.md", "assets/logo.svg"];

test("folderEntries lists a folder's subfolders (with file counts) and its own files, sorted", () => {
  assert.deepEqual(plain(d.folderEntries(paths, "")), {
    folders: [
      { name: "assets", path: "assets", count: 1 },
      { name: "docs", path: "docs", count: 1 },
      { name: "src", path: "src", count: 4 },
    ],
    files: [
      { name: "package.json", path: "package.json" },
      { name: "README.md", path: "README.md" },
    ],
  });
  const src = plain(d.folderEntries(paths, "src"));
  assert.deepEqual(src.folders, [{ name: "components", path: "src/components", count: 2 }]);
  assert.deepEqual(src.files.map((f) => f.name), ["App.tsx", "index.css"]);
  assert.deepEqual(plain(d.folderEntries(paths, "nope")), { folders: [], files: [] });
});

test("pathTabs goes from the repo root to the folder; collapseTabs keeps the root and the last tabs", () => {
  assert.deepEqual(plain(d.pathTabs("", "app")), [{ label: "app", path: "" }]);
  const deep = d.pathTabs("a/b/c/d/e", "app");
  assert.deepEqual(plain(deep).map((t) => t.path), ["", "a", "a/b", "a/b/c", "a/b/c/d", "a/b/c/d/e"]);
  const short = plain(d.collapseTabs(deep, 5));
  assert.deepEqual(short.map((t) => t.label), ["app", "…", "c", "d", "e"]);
  assert.deepEqual(short[1], { label: "…", path: "a/b", hidden: 2 }, "the … tab opens the last hidden folder");
  assert.equal(d.collapseTabs(d.pathTabs("a/b", "app"), 5).length, 3, "short paths stay as they are");
});

test("sibling colours go by position: neighbours differ and none matches the strip they sit on", () => {
  const tones = plain(d.siblingTones(7, "cyan"));
  assert.equal(tones.length, 7);
  assert.ok(!tones.includes("cyan"), "no tab is the colour of its strip");
  for (let i = 1; i < tones.length; i++) assert.notEqual(tones[i], tones[i - 1]);
  assert.deepEqual(plain(d.siblingTones(2, null)), plain(d.siblingTones(2, "pink")), "the root strip is pink, which no folder uses");
});

test("pathTones: root pink, each folder coloured by its place among its siblings", () => {
  const tones = d.pathTones(paths, "src/components/ui");
  assert.equal(tones.get(""), "pink");
  const top = plain(d.siblingTones(3, "pink")); // assets, docs, src
  assert.equal(tones.get("src"), top[2]);
  assert.equal(tones.get("src/components"), plain(d.siblingTones(1, tones.get("src")))[0]);
  assert.notEqual(tones.get("src/components"), tones.get("src"));
  assert.notEqual(tones.get("src/components/ui"), tones.get("src/components"));
  assert.equal(d.pathTones(paths, "docs").get("docs"), top[1], "a folder keeps its colour whichever sibling is open");
});

test("filterFiles: changed uses the given set (unsaved new files too), code and docs go by type", () => {
  assert.equal(d.filterFiles(paths, "all"), paths);
  assert.deepEqual(plain(d.filterFiles(paths, "changed", new Set(["src/App.tsx", "src/new.ts"]))), ["src/App.tsx", "src/new.ts"]);
  assert.deepEqual(plain(d.filterFiles(paths, "code")), ["src/App.tsx", "src/components/Nav.tsx", "src/components/ui/Button.tsx", "src/index.css"]);
  assert.deepEqual(plain(d.filterFiles(paths, "docs")), ["docs/guide.md", "README.md"]);
});

test("matchFiles finds every word, file-name hits first", () => {
  assert.deepEqual(plain(d.matchFiles(paths, "")), []);
  assert.deepEqual(plain(d.matchFiles(paths, "button")), ["src/components/ui/Button.tsx"]);
  assert.deepEqual(plain(d.matchFiles(paths, "src tsx")).slice(0, 1), ["src/App.tsx"]);
  assert.deepEqual(plain(d.matchFiles(["src/readme/x.ts", "README.md"], "readme")), ["README.md", "src/readme/x.ts"]);
});

test("folderOf", () => {
  assert.equal(d.folderOf("src/components/Nav.tsx"), "src/components");
  assert.equal(d.folderOf("README.md"), "");
});
