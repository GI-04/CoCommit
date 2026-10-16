import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Username check for the Invite form (PLAN/2026-10-16-invite-in-app.md).
const code = ts.transpileModule(readFileSync(new URL("../src/lib/invite.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const m = {};
vm.runInNewContext(code, { exports: m });

test("accepts a username, with or without @ and spaces", () => {
  assert.equal(m.cleanUsername("octocat"), "octocat");
  assert.equal(m.cleanUsername("  @octo-cat "), "octo-cat");
});
test("rejects names that aren't GitHub usernames", () => {
  for (const bad of ["", "a b", "-x", "x/y", "../x", null, "a".repeat(40)]) assert.equal(m.cleanUsername(bad), null, String(bad));
});
