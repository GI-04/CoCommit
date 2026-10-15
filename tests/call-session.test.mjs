import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// The call that stays on while you use the app (PLAN/2026-10-16-call-stays-on.md). No real LiveKit or network.
function load() {
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/call-session.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, JSON });
  return exports;
}
const c = load();
const reply = (ok, body) => async (url, init) => {
  reply.last = { url, init };
  return { ok, json: async () => body };
};

test("joining asks our server for the repo's room and returns the session", async () => {
  const s = await c.requestCall("GI-04/CoCommit", reply(true, { token: "tok", url: "wss://lk.example" }));
  assert.deepEqual({ ...s }, { repo: "GI-04/CoCommit", url: "wss://lk.example", token: "tok" });
  assert.equal(reply.last.url, "/api/livekit-token");
  assert.equal(reply.last.init.method, "POST");
  assert.deepEqual(JSON.parse(reply.last.init.body), { repo: "GI-04/CoCommit" });
});

test("the server's error comes through as is (e.g. signed out)", async () => {
  await assert.rejects(c.requestCall("GI-04/CoCommit", reply(false, { error: "Log in to join the call." })), /Log in to join the call\./);
});

test("a reply without a token or url is an error, not a broken call", async () => {
  await assert.rejects(c.requestCall("r/x", reply(true, { url: "wss://lk.example" })), /Couldn't join the call/);
  await assert.rejects(c.requestCall("r/x", reply(true, { token: "tok" })), /Couldn't join the call/);
  const bad = async () => ({ ok: true, json: async () => { throw new Error("not json"); } });
  await assert.rejects(c.requestCall("r/x", bad), /Couldn't join the call/);
});

test("the call bar shows on every page but /calls, and only during a call", () => {
  for (const page of ["/home", "/repo", "/chat", "/context", "/tasks", "/files", "/profile", "/"]) assert.equal(c.showCallBar(page, true), true, page);
  assert.equal(c.showCallBar("/calls", true), false);
  assert.equal(c.showCallBar("/calls/anything", true), false);
  assert.equal(c.showCallBar("/chat", false), false);
  assert.equal(c.showCallBar(null, true), true);
});

test("pop out is offered only where the browser supports picture-in-picture", () => {
  assert.equal(c.pipSupported({ pictureInPictureEnabled: true }), true);
  assert.equal(c.pipSupported({ pictureInPictureEnabled: false }), false);
  assert.equal(c.pipSupported({}), false);
  assert.equal(c.pipSupported(undefined), false);
});
