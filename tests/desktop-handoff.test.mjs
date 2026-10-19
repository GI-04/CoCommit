import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Desktop GitHub sign-in ticket (PLAN/2026-10-16-desktop-github-login.md): round trip, expiry, tampering, and the
// challenge that binds a ticket to the app window that started the sign-in (PLAN/2026-10-19-security-fixes.md, item 1).
const code = ts.transpileModule(readFileSync(new URL("../src/lib/desktop-handoff.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = {};
vm.runInNewContext(code, { exports: mod, Buffer, JSON, Date, require: (n) => (n === "node:crypto" ? require_crypto : null) });
import * as require_crypto from "node:crypto";

// RFC 7636's example pair: challenge = base64url(sha256(verifier)).
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const data = { accessToken: "a.b.c", refreshToken: "r", githubToken: "gho_x", next: "/home", challenge: CHALLENGE };

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

test("a ticket needs a challenge, and keeps it", () => {
  for (const challenge of [undefined, "", "short", CHALLENGE + "x", CHALLENGE.slice(0, -1) + "="]) {
    assert.equal(mod.sealHandoff({ ...data, challenge }, "secret", 1000), null, String(challenge));
  }
  assert.equal(mod.openHandoff(mod.sealHandoff(data, "secret", 1000), "secret", 1001).challenge, CHALLENGE);
});

test("only the verifier behind the challenge redeems a ticket", () => {
  assert.equal(mod.challengeFor(VERIFIER), CHALLENGE);
  assert.equal(mod.verifierMatches(VERIFIER, CHALLENGE), true);
  for (const wrong of [VERIFIER.slice(0, -1) + "l", CHALLENGE, "", null, undefined, 42, "x".repeat(200), VERIFIER + "\n"]) {
    assert.equal(mod.verifierMatches(wrong, CHALLENGE), false, String(wrong));
  }
  assert.equal(mod.verifierMatches(VERIFIER, "not-a-challenge"), false);
});

test("tickets last two minutes", () => {
  assert.equal(mod.TICKET_TTL_MS, 2 * 60 * 1000);
});
