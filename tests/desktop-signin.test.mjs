import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Desktop GitHub sign-in bound to the app window (PLAN/2026-10-19-security-fixes.md, item 1): the window's verifier
// helper (desktop-login.ts) and /auth/desktop/finish, run with a fake Supabase and cookie helpers. No network.
function load(path, imports = {}, extra = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, console, Buffer, JSON, Date, URL, URLSearchParams, Promise,
    process: { env: { GITHUB_CLIENT_SECRET: "secret" } },
    require: (name) => {
      if (name in imports) return imports[name];
      if (name === "node:crypto") return createRequire(import.meta.url)("node:crypto");
      throw new Error(`Unexpected dependency: ${name}`);
    },
    ...extra,
  });
  return exports;
}

const handoff = load("lib/desktop-handoff.ts");
const identity = load("lib/login-identity.ts");
const plain = (x) => JSON.parse(JSON.stringify(x));

// ---------- desktop-login.ts (app window)

function storage() {
  const items = new Map();
  return { items, getItem: (k) => items.get(k) ?? null, setItem: (k, v) => items.set(k, String(v)), removeItem: (k) => items.delete(k) };
}

function windowHelper(localStorage = storage()) {
  return { api: load("lib/desktop-login.ts", {}, { crypto: webcrypto, TextEncoder, btoa, localStorage }), localStorage };
}

test("a new sign-in's challenge is the hash of its verifier, and each one is fresh", async () => {
  const { api } = windowHelper();
  const a = await api.newSignIn();
  const b = await api.newSignIn();
  assert.match(a.verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(a.challenge, createHash("sha256").update(a.verifier).digest("base64url"));
  assert.equal(handoff.verifierMatches(a.verifier, a.challenge), true);
  assert.notEqual(a.verifier, b.verifier);
});

test("the kept verifier works once and goes stale after ten minutes", () => {
  const { api } = windowHelper();
  api.rememberSignIn("v1", 1000);
  assert.equal(api.takeSignIn(1000 + 60_000), "v1");
  assert.equal(api.takeSignIn(1000 + 60_000), null);
  api.rememberSignIn("v2", 1000);
  assert.equal(api.takeSignIn(1000 + api.SIGNIN_MAX_AGE_MS + 1), null);
  // A newer sign-in replaces the older one.
  api.rememberSignIn("old", 1000);
  api.rememberSignIn("new", 2000);
  assert.equal(api.takeSignIn(3000), "new");
});

test("blocked or damaged storage means no verifier, not a crash", () => {
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  const { api } = windowHelper(broken);
  api.rememberSignIn("v", 1);
  assert.equal(api.takeSignIn(2), null);
  const { api: api2, localStorage } = windowHelper();
  localStorage.setItem("cc_desktop_signin", "{not json");
  assert.equal(api2.takeSignIn(), null);
});

// ---------- /auth/desktop/finish

const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const ORIGIN = "https://cocommit.vercel.app";

function finishRoute({ user = { id: "u1", identities: [{ provider: "github", id: "1" }] }, sessionError = null } = {}) {
  const calls = { setSession: [], saved: [], forgot: 0 };
  const next = {
    NextResponse: {
      json: (body, init) => ({ status: init?.status ?? 200, body: plain(body) }),
      redirect: (url) => ({ status: 307, location: String(url) }),
    },
  };
  const route = load("app/auth/desktop/finish/route.ts", {
    "next/server": next,
    "@/lib/desktop-handoff": handoff,
    "@/lib/login-identity": identity,
    "@/lib/github": { saveGitHubToken: async (t) => calls.saved.push(t), signOut: async () => calls.forgot++ },
    "@/lib/supabase-server": {
      getSupabaseServer: async () => ({
        auth: { setSession: async (s) => (calls.setSession.push(s), { data: { user }, error: sessionError }) },
      }),
    },
  });
  return { route, calls };
}

const ticket = (extra = {}) =>
  handoff.sealHandoff({ accessToken: "acc", refreshToken: "ref", githubToken: "gho_x", next: "/chat", challenge: CHALLENGE, ...extra }, "secret");

const post = (body, headers = {}) => ({
  url: `${ORIGIN}/auth/desktop/finish`,
  headers: new Map(Object.entries({ origin: ORIGIN, "content-type": "application/json", ...headers })),
  json: async () => body,
});

test("GET only forwards the ticket to the confirm page and sets nothing", async () => {
  const { route, calls } = finishRoute();
  const t = ticket();
  const res = await route.GET({ url: `${ORIGIN}/auth/desktop/finish?ticket=${t}` });
  assert.equal(res.location, `${ORIGIN}/auth/desktop/confirm?ticket=${t}`);
  assert.deepEqual(calls, { setSession: [], saved: [], forgot: 0 });
});

test("the window that started the sign-in gets the session and its GitHub token", async () => {
  const { route, calls } = finishRoute();
  const res = await route.POST(post({ ticket: ticket(), verifier: VERIFIER }));
  assert.deepEqual(res, { status: 200, body: { next: "/chat" } });
  assert.deepEqual(plain(calls.setSession), [{ access_token: "acc", refresh_token: "ref" }]);
  assert.deepEqual(calls.saved, ["gho_x"]);
});

test("someone else's ticket, without the verifier, signs nobody in", async () => {
  const { route, calls } = finishRoute();
  for (const verifier of [undefined, "", "x".repeat(43), CHALLENGE]) {
    const res = await route.POST(post({ ticket: ticket(), verifier }));
    assert.equal(res.status, 400, String(verifier));
  }
  assert.equal((await route.POST(post({ ticket: "damaged", verifier: VERIFIER }))).status, 400);
  assert.equal((await route.POST(post({ verifier: VERIFIER }))).status, 400);
  assert.deepEqual(calls.setSession, []);
  assert.deepEqual(calls.saved, []);
});

test("only this site's own pages can redeem, with JSON", async () => {
  const { route, calls } = finishRoute();
  assert.equal((await route.POST(post({ ticket: ticket(), verifier: VERIFIER }, { origin: "https://evil.example" }))).status, 403);
  assert.equal((await route.POST(post({ ticket: ticket(), verifier: VERIFIER }, { origin: undefined }))).status, 403);
  assert.equal((await route.POST(post({ ticket: ticket(), verifier: VERIFIER }, { "content-type": "text/plain" }))).status, 415);
  assert.deepEqual(calls.setSession, []);
});

test("a ticket without a GitHub token drops a stray GitHub cookie, unless the account has its own GitHub", async () => {
  const email = finishRoute({ user: { id: "u2", identities: [{ provider: "email" }] } });
  assert.equal((await email.route.POST(post({ ticket: ticket({ githubToken: null }), verifier: VERIFIER }))).status, 200);
  assert.equal(email.calls.forgot, 1);
  const github = finishRoute();
  assert.equal((await github.route.POST(post({ ticket: ticket({ githubToken: null }), verifier: VERIFIER }))).status, 200);
  assert.equal(github.calls.forgot, 0);
});

test("a refused session or an unsafe next page doesn't get through", async () => {
  const { route, calls } = finishRoute({ sessionError: { message: "expired" } });
  assert.equal((await route.POST(post({ ticket: ticket(), verifier: VERIFIER }))).status, 400);
  assert.deepEqual(calls.saved, []);
  const ok = finishRoute();
  const res = await ok.route.POST(post({ ticket: ticket({ next: "/\\evil.example" }), verifier: VERIFIER }));
  assert.deepEqual(res.body, { next: "/home" });
});
