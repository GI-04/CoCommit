import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Friendly error messages (PLAN/2026-10-16-ux-round-2.md).
const code = ts.transpileModule(readFileSync(new URL("../src/lib/errors.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const m = {};
vm.runInNewContext(code, { exports: m, Error, String, RegExp });
const err = (status, message) => Object.assign(new Error(message), { status });

test("GitHub and network problems get plain wording", () => {
  assert.match(m.friendlyError(err(404, "Not Found")), /couldn't find that/);
  assert.match(m.friendlyError(err(401, "Bad credentials")), /Log in with GitHub/);
  assert.match(m.friendlyError(err(403, "API rate limit exceeded for user")), /limiting requests/);
  assert.match(m.friendlyError(err(403, "Resource not accessible")), /permission/);
  assert.match(m.friendlyError(err(409, "conflict")), /changed while you were working/);
  assert.match(m.friendlyError(err(422, "Reference already exists")), /already taken/);
  assert.match(m.friendlyError(err(502, "Bad gateway")), /GitHub had a problem/);
  assert.match(m.friendlyError(new Error("Failed to fetch")), /Can't reach CoCommit/);
  assert.match(m.friendlyError(new Error("Load failed")), /Can't reach CoCommit/);
});

test("our own messages pass through; empty ones use the fallback", () => {
  assert.equal(m.friendlyError(new Error("Give the task a title.")), "Give the task a title.");
  assert.equal(m.friendlyError(err(422, "Title is required")), "Title is required");
  assert.equal(m.friendlyError(new Error("")), "Something went wrong. Try again.");
  assert.equal(m.friendlyError(undefined, "Couldn't load."), "Couldn't load.");
  assert.equal(m.friendlyError("plain text"), "plain text");
});
