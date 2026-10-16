import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Desktop GitHub sign-in ticket (PLAN/2026-10-16-desktop-github-login.md): round trip, expiry, tampering.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/desktop-handoff.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = {};
vm.runInNewContext(code, { exports: mod, Buffer, JSON, Date, require: (n) => (n === "node:crypto" ? require_crypto : null) });
import * as require_crypto from "node:crypto";

const data = { accessToken: "a.b.c", refreshToken: "r", githubToken: "gho_x", next: "/home" };

test("a ticket opens back into the same session", () => {
  const t = mod.sealHandoff(data, "secret", 1000);
  assert.equal(JSON.stringify(mod.openHandoff(t, "secret", 1000 + 1000)), JSON.stringify(data));
});

test("a ticket expires", () => {
  const t = mod.sealHandoff(data, "secret", 1000);
  assert.equal(mod.openHandoff(t, "secret", 1000 + mod.TICKET_TTL_MS + 1), null);
});

test("wrong secret, damage and missing values are refused", () => {
  const t = mod.sealHandoff(data, "secret", 1000);
  assert.equal(mod.openHandoff(t, "other", 1000), null);
  assert.equal(mod.openHandoff(t.slice(0, -4) + "AAAA", "secret", 1000), null);
  assert.equal(mod.openHandoff(null, "secret"), null);
  assert.equal(mod.sealHandoff(data, ""), null);
});

test("a ticket without a GitHub token keeps the rest", () => {
  const t = mod.sealHandoff({ ...data, githubToken: null }, "secret", 1000);
  assert.equal(mod.openHandoff(t, "secret", 1001).githubToken, null);
});
