import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// The picked repo shared between /repo and /chat (PLAN/2026-10-16-demo-polish-kin.md, item 1).
function load(storage) {
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/current-repo.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, localStorage: storage });
  return exports;
}
const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
};

test("falls back to the demo repo until one is picked", () => {
  const r = load(memory());
  assert.equal(r.getCurrentRepo(), "GI-04/CoCommit");
});

test("remembers a picked repo", () => {
  const r = load(memory());
  r.setCurrentRepo("KINKIN-007/Github101");
  assert.equal(r.getCurrentRepo(), "KINKIN-007/Github101");
});

test("#general and odd values are never saved or read as a repo", () => {
  const store = memory();
  const r = load(store);
  for (const bad of ["general", "", "no-slash", "a/b/c", "../x", "a/b c"]) r.setCurrentRepo(bad);
  assert.equal(r.getCurrentRepo(), "GI-04/CoCommit");
  store.setItem("cocommit-current-repo", "general"); // e.g. edited by hand
  assert.equal(r.getCurrentRepo(), "GI-04/CoCommit");
  assert.equal(r.isRepoName(r.GENERAL), false);
});

test("blocked storage falls back quietly", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const r = load(blocked);
  assert.doesNotThrow(() => r.setCurrentRepo("KINKIN-007/Github101"));
  assert.equal(r.getCurrentRepo(), "GI-04/CoCommit");
});
