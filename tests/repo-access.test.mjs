import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Repo membership as GitHub reports it (PLAN/2026-10-19-security-fixes.md, item 3): the real github.ts repoAccess /
// canSeeRepo against a fake GitHub answer, signed in with a sealed test token. No network.
function load(path, imports, extra = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/lib/${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Buffer, Promise, JSON, Map, Set, Math, Number, Array, String, Error, URLSearchParams,
    console: { warn() {}, log() {}, error() {} },
    require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    ...extra,
  });
  return exports;
}

const SECRET = "test-secret";
// Same sealing as github.ts (cookieKey + AES-256-GCM), so token() finds a signed-in user.
function sealed(token) {
  const key = crypto.createHash("sha256").update(`cocommit-github-cookie:${SECRET}`).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** github.ts with real keys set (not fake mode) and `answer(url)` standing in for GitHub. */
function github(answer, { signedIn = true, env = { GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: SECRET } } = {}) {
  const asked = [];
  const cookie = signedIn ? sealed("gho_test") : undefined;
  const mod = load(
    "github.ts",
    {
      "node:crypto": crypto,
      "next/headers": { cookies: async () => ({ get: (name) => (name === "cc_github" && cookie ? { value: cookie } : undefined) }) },
      "./git-modes": load("git-modes.ts", {}),
      "./login-identity": { hasGitHubIdentity: () => false, safeReturnTo: (p, f = "/repo") => p || f },
      "./supabase-server": { getSupabaseServer: async () => null },
      "./repo-access": load("repo-access.ts", {}),
      "./invite": { cleanUsername: (v) => v },
      "./files-util": load("files-util.ts", {}),
    },
    {
      process: { env },
      globalThis: {},
      fetch: async (url, init) => {
        asked.push({ url: String(url), auth: init?.headers?.Authorization });
        const { status = 200, body = {} } = await answer(String(url));
        return { ok: status >= 200 && status < 300, status, statusText: String(status), json: async () => body };
      },
    },
  );
  return { mod, asked };
}

const repoAnswer = (body) => () => ({ body: { id: 869245913, full_name: "GI-04/CoCommit", ...body } });

test("a collaborator on a public repo is a member and gets GitHub's repo id", async () => {
  const { mod, asked } = github(repoAnswer({ private: false, permissions: { pull: true, push: true } }));
  assert.deepEqual({ ...(await mod.repoAccess("GI-04/CoCommit")) }, { access: "member", id: 869245913 });
  assert.equal(asked[0].url, "https://api.github.com/repos/GI-04/CoCommit");
  assert.equal(asked[0].auth, "Bearer gho_test");
  assert.equal(await mod.canSeeRepo("GI-04/CoCommit"), "member");
});

test("someone who can only read a public repo is not a member and gets no id", async () => {
  const { mod } = github(repoAnswer({ private: false, permissions: { pull: true, push: false, triage: false, maintain: false, admin: false } }));
  assert.deepEqual({ ...(await mod.repoAccess("GI-04/CoCommit")) }, { access: "not-member", id: null });
  assert.equal(await mod.canSeeRepo("GI-04/CoCommit"), "not-member");
});

test("anyone GitHub shows a private repo to is a member", async () => {
  const { mod } = github(repoAnswer({ private: true, permissions: { pull: true } }));
  assert.deepEqual({ ...(await mod.repoAccess("acme/secret")) }, { access: "member", id: 869245913 });
});

test("hidden repos, no sign-in and broken answers", async () => {
  for (const [status, access] of [[404, "not-member"], [403, "not-member"], [401, "no-github"]]) {
    const { mod } = github(() => ({ status, body: { message: "nope" } }));
    assert.deepEqual({ ...(await mod.repoAccess("acme/secret")) }, { access, id: null }, String(status));
  }
  // No GitHub cookie at all: no GitHub sign-in, and GitHub isn't asked.
  const signedOut = github(repoAnswer({ private: false, permissions: { push: true } }), { signedIn: false });
  assert.deepEqual({ ...(await signedOut.mod.repoAccess("GI-04/CoCommit")) }, { access: "no-github", id: null });
  assert.equal(signedOut.asked.length, 0);
  // GitHub down: the caller decides (the routes answer 502).
  await assert.rejects(github(() => ({ status: 500 })).mod.repoAccess("GI-04/CoCommit"));
  // A member answer without a usable id: still a member, but no id to name a room after.
  const noId = github(() => ({ body: { private: true, id: "869245913" } }));
  assert.deepEqual({ ...(await noId.mod.repoAccess("acme/secret")) }, { access: "member", id: null });
});

test("bad repo names are refused before GitHub is asked", async () => {
  const { mod, asked } = github(repoAnswer({ private: true }));
  for (const bad of ["../x", "a/b/c", "norepo"]) await assert.rejects(mod.repoAccess(bad), String(bad));
  assert.equal(asked.length, 0);
});

test("fake mode lets everyone in with a stable stand-in id per repo", async () => {
  const { mod, asked } = github(() => ({}), { env: {} });
  const a = await mod.repoAccess("acme/my-app");
  assert.equal(a.access, "member");
  assert.ok(Number.isSafeInteger(a.id) && a.id > 0);
  assert.equal((await mod.repoAccess("ACME/My-App")).id, a.id);
  assert.notEqual((await mod.repoAccess("acme-my/app")).id, a.id);
  assert.equal(asked.length, 0);
});
