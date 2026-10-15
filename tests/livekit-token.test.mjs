import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// LiveKit calls (PLAN/2026-10-16-livekit-calls.md): token signing and room names. No network.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/livekit-token.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const lk = {};
vm.runInNewContext(code, { exports: lk, require: createRequire(import.meta.url), Buffer, process: { env: {} } });

const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

test("liveKitKeys needs all three values", () => {
  assert.equal(lk.liveKitKeys({}), null);
  assert.equal(lk.liveKitKeys({ NEXT_PUBLIC_LIVEKIT_URL: "wss://x", LIVEKIT_API_KEY: "k" }), null);
  assert.deepEqual({ ...lk.liveKitKeys({ NEXT_PUBLIC_LIVEKIT_URL: "wss://x", LIVEKIT_API_KEY: "k", LIVEKIT_API_SECRET: "s" }) }, {
    url: "wss://x",
    apiKey: "k",
    apiSecret: "s",
  });
});

test("roomForRepo makes one safe room per repo and rejects anything else", () => {
  assert.equal(lk.roomForRepo("GI-04/CoCommit"), "cocommit-gi-04-cocommit");
  assert.equal(lk.roomForRepo("me/my.repo_1"), "cocommit-me-my-repo-1");
  for (const bad of [undefined, 42, "", "norepo", "a/b/c", "a/b c", "../x"]) assert.equal(lk.roomForRepo(bad), null, String(bad));
});

test("createToken signs a LiveKit join token", () => {
  const now = Date.UTC(2026, 9, 16, 1, 0, 0);
  const token = lk.createToken({ apiKey: "APIkey", apiSecret: "secret" }, { identity: "gh:octo", name: "Octo" }, "cocommit-a-b", 3600, now);
  const [h, p, sig] = token.split(".");

  assert.deepEqual(decode(h), { alg: "HS256", typ: "JWT" });
  const payload = decode(p);
  assert.equal(payload.iss, "APIkey");
  assert.equal(payload.sub, "gh:octo");
  assert.equal(payload.name, "Octo");
  assert.equal(payload.exp - payload.iat, 3600);
  assert.equal(payload.nbf, now / 1000);
  assert.deepEqual(payload.video, { room: "cocommit-a-b", roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });

  assert.equal(sig, createHmac("sha256", "secret").update(`${h}.${p}`).digest("base64url"));
  assert.notEqual(sig, createHmac("sha256", "other").update(`${h}.${p}`).digest("base64url"));
});
