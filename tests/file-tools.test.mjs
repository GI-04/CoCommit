import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Helpers for the file tools on the Repository page (PLAN/2026-10-16-overview-spines-file-tools.md).
const code = ts.transpileModule(readFileSync(new URL("../src/lib/file-tools.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const f = {};
vm.runInNewContext(code, { exports: f, String, RegExp });

test("downloadName is the last part of the path", () => {
  assert.equal(f.downloadName("src/app/page.tsx"), "page.tsx");
  assert.equal(f.downloadName("README.md"), "README.md");
  assert.equal(f.downloadName("docs\\guide\\setup.md"), "setup.md");
  assert.equal(f.downloadName("dir/sub/"), "sub");
  assert.equal(f.downloadName(".env.example"), ".env.example");
});

test("downloadName never gives an empty or unsafe name, and a diff gets .diff", () => {
  assert.equal(f.downloadName(""), "file.txt");
  assert.equal(f.downloadName("///"), "file.txt");
  assert.equal(f.downloadName(undefined), "file.txt");
  assert.equal(f.downloadName('a<b>:c|d?.txt'), "a-b-c-d-.txt");
  assert.equal(f.downloadName("src/lib/github.ts", "diff"), "github.ts.diff");
  assert.equal(f.downloadName("", "diff"), "file.txt.diff");
});

test("fileQuestion names the file, the repo and the branch", () => {
  assert.equal(f.fileQuestion("src/app/page.tsx", "GI-04/CoCommit", "main"), "Explain `src/app/page.tsx` in GI-04/CoCommit on the main branch: what it does and how it fits the rest of the project.");
  assert.match(f.fileQuestion("a.ts", "o/r", "fix", "diff"), /changes to `a\.ts` in o\/r on the fix branch/);
  assert.equal(f.fileQuestion("a.ts", "", ""), "Explain `a.ts`: what it does and how it fits the rest of the project.");
});
