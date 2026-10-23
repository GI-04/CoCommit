import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Repo chats and calls for repo members only (PLAN/2026-10-16-repo-members-only.md). Drives the call token route,
// the chat join route and chat.ts with a fake GitHub answer and a fake Supabase. No network, no keys.
function load(path, imports = {}, extra = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, console, crypto, setTimeout, Buffer, JSON, Date, Promise,
    process: { env: {} },
    require: (name) => {
      if (name in imports) return imports[name];
      if (name === "node:crypto") return createRequire(import.meta.url)("node:crypto");
      throw new Error(`Unexpected dependency: ${name}`);
    },
    ...extra,
  });
  return exports;
}

const access = load("lib/repo-access.ts");
const currentRepo = load("lib/current-repo.ts");
const lk = load("lib/livekit-token.ts");
const plain = (x) => JSON.parse(JSON.stringify(x));
const next = { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body: plain(body) }) } };
const request = (body) => ({ json: async () => body });

test("a private repo GitHub shows you counts; on a public repo only people who work on it do", () => {
  assert.equal(access.accessFromRepo({ private: true, permissions: { pull: true } }), "member");
  assert.equal(access.accessFromRepo({ private: true }), "member");
  for (const role of ["push", "triage", "maintain", "admin"]) {
    assert.equal(access.accessFromRepo({ private: false, permissions: { pull: true, [role]: true } }), "member", role);
  }
  // A reader of a public repo, or an answer without permissions, is not a member.
  assert.equal(access.accessFromRepo({ private: false, permissions: { pull: true, push: false, triage: false, maintain: false, admin: false } }), "not-member");
  assert.equal(access.accessFromRepo({ private: false }), "not-member");
  assert.equal(access.accessFromRepo({ private: false, permissions: null }), "not-member");
  assert.equal(access.accessFromRepo({}), "not-member");
});

test("GitHub's answer decides access: 2xx member, 401 no GitHub, 403/404 not a member, others unknown", () => {
  assert.equal(access.accessFromStatus(200), "member");
  assert.equal(access.accessFromStatus(401), "no-github");
  assert.equal(access.accessFromStatus(403), "not-member");
  assert.equal(access.accessFromStatus(404), "not-member");
  assert.equal(access.accessFromStatus(500), null);
  assert.equal(access.accessError("member"), null);
  assert.deepEqual(plain(access.accessError("not-member")), { status: 403, error: access.NOT_MEMBER, access: "not-member" });
  assert.deepEqual(plain(access.accessError("no-github")), { status: 403, error: access.NEEDS_GITHUB_FOR_REPO, access: "no-github" });
});

// ---------- Calls: /api/livekit-token

// GitHub's repo ids for the fake answers; a member gets the id, everyone else null (as repoAccess does).
const IDS = { "GI-04/CoCommit": 869245913, "acme/my-app": 1001, "acme-my/app": 2002 };

function callRoute(answer, seen = []) {
  const github = {
    fakeMode: false,
    getSession: async () => ({ user: { login: "octo", name: "Octo" }, fake: false }),
    repoAccess: async (repo) => {
      seen.push(repo);
      if (answer instanceof Error) throw answer;
      return { access: answer, id: answer === "member" ? (IDS[repo] ?? 42) : null };
    },
  };
  const liveKit = { ...lk, liveKitKeys: () => ({ url: "wss://lk.example", apiKey: "k", apiSecret: "s" }) };
  return load("app/api/livekit-token/route.ts", {
    "next/server": next,
    "@/lib/current-repo": currentRepo,
    "@/lib/github": github,
    "@/lib/livekit-token": liveKit,
    "@/lib/repo-access": access,
    "@/lib/supabase-server": { getSupabaseServer: async () => null },
  });
}

test("a member of the repo gets a call token", async () => {
  const seen = [];
  const res = await callRoute("member", seen).POST(request({ repo: "GI-04/CoCommit" }));
  assert.equal(res.status, 200);
  assert.equal(res.body.room, "cocommit-repo-869245913");
  assert.ok(res.body.token);
  assert.deepEqual(seen, ["GI-04/CoCommit"]);
});

test("someone GitHub doesn't show the repo to, or without GitHub sign-in, gets no call token", async () => {
  for (const [answer, error] of [["not-member", access.NOT_MEMBER], ["no-github", access.NEEDS_GITHUB_FOR_REPO]]) {
    const res = await callRoute(answer).POST(request({ repo: "secret/repo" }));
    assert.equal(res.status, 403, answer);
    assert.equal(res.body.error, error);
    assert.equal(res.body.token, undefined);
  }
});

test("repos whose names look alike get their own rooms, named by GitHub's id", async () => {
  const a = await callRoute("member").POST(request({ repo: "acme/my-app" }));
  const b = await callRoute("member").POST(request({ repo: "acme-my/app" }));
  assert.equal(a.body.room, "cocommit-repo-1001");
  assert.equal(b.body.room, "cocommit-repo-2002");
});

test("a bad repo name gets no token and GitHub isn't asked", async () => {
  for (const bad of [undefined, "", "norepo", "a/b/c", "../x", 42]) {
    const seen = [];
    const res = await callRoute("member", seen).POST(request({ repo: bad }));
    assert.equal(res.status, 400, String(bad));
    assert.deepEqual(seen, []);
  }
});

test("a member answer without a usable repo id gets no token", async () => {
  const route = load("app/api/livekit-token/route.ts", {
    "next/server": next,
    "@/lib/current-repo": currentRepo,
    "@/lib/github": { fakeMode: false, getSession: async () => ({ user: { login: "octo", name: "Octo" }, fake: false }), repoAccess: async () => ({ access: "member", id: null }) },
    "@/lib/livekit-token": { ...lk, liveKitKeys: () => ({ url: "wss://lk.example", apiKey: "k", apiSecret: "s" }) },
    "@/lib/repo-access": access,
    "@/lib/supabase-server": { getSupabaseServer: async () => null },
  });
  const res = await route.POST(request({ repo: "GI-04/CoCommit" }));
  assert.equal(res.status, 502);
  assert.equal(res.body.token, undefined);
});

test("if GitHub can't be reached, the call says so instead of letting anyone in", async () => {
  const res = await callRoute(new Error("network down")).POST(request({ repo: "GI-04/CoCommit" }));
  assert.equal(res.status, 502);
  assert.equal(res.body.token, undefined);
});

// ---------- Chat: /api/chat/join

function joinRoute({ user = { id: "u1", is_anonymous: false }, answer = "member", admin = true, supabase = true } = {}) {
  const writes = [];
  const adminClient = {
    from: (table) => ({
      upsert: async (row, opts) => (writes.push({ table, row, opts }), { error: null }),
    }),
  };
  const route = load("app/api/chat/join/route.ts", {
    "next/server": next,
    "@/lib/current-repo": currentRepo,
    "@/lib/github": { canSeeRepo: async () => answer },
    "@/lib/repo-access": access,
    "@/lib/supabase-admin": { getSupabaseAdmin: () => (admin ? adminClient : null) },
    "@/lib/supabase-server": { getSupabaseServer: async () => (supabase ? { auth: { getUser: async () => ({ data: { user } }) } } : null) },
  });
  return { route, writes };
}

test("a member is recorded in repo_members for that repo", async () => {
  const { route, writes } = joinRoute();
  const res = await route.POST(request({ repo: "GI-04/CoCommit" }));
  assert.deepEqual(res, { status: 200, body: { ok: true, recorded: true } });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].table, "repo_members");
  assert.equal(writes[0].row.user_id, "u1");
  assert.equal(writes[0].row.repo, "GI-04/CoCommit");
  assert.ok(!Number.isNaN(Date.parse(writes[0].row.checked_at)));
  assert.equal(writes[0].opts.onConflict, "user_id,repo");
});

test("not a member, or no GitHub sign-in: 403 and nothing recorded", async () => {
  for (const answer of ["not-member", "no-github"]) {
    const { route, writes } = joinRoute({ answer });
    const res = await route.POST(request({ repo: "secret/repo" }));
    assert.equal(res.status, 403, answer);
    assert.equal(res.body.access, answer);
    assert.deepEqual(writes, []);
  }
});

test("# general needs no check; signed-out, anonymous and bad names are refused", async () => {
  assert.deepEqual(await joinRoute({ answer: "not-member" }).route.POST(request({ repo: "general" })), { status: 200, body: { ok: true } });
  assert.equal((await joinRoute({ user: null }).route.POST(request({ repo: "GI-04/CoCommit" }))).status, 401);
  assert.equal((await joinRoute({ user: { id: "a", is_anonymous: true } }).route.POST(request({ repo: "GI-04/CoCommit" }))).status, 401);
  for (const bad of [undefined, "", "norepo", "../x", "a/b/c"]) {
    assert.equal((await joinRoute().route.POST(request({ repo: bad }))).status, 400, String(bad));
  }
});

test("without the service role key a member still gets in, but nothing is recorded (before the SQL is run)", async () => {
  const { route, writes } = joinRoute({ admin: false });
  assert.deepEqual(await route.POST(request({ repo: "GI-04/CoCommit" })), { status: 200, body: { ok: true, recorded: false } });
  assert.deepEqual(writes, []);
});

// ---------- chat.ts: asks /api/chat/join before reading a repo chat

function chatWith(joinStatus, joinBody = {}) {
  const asked = [];
  const user = { id: "u1", is_anonymous: false, user_metadata: { full_name: "Alice" } };
  const q = { select: () => q, eq: () => q, order: () => q, limit: async () => ({ data: [], error: null }) };
  const client = {
    auth: { getUser: async () => ({ data: { user } }), getSession: async () => ({ data: { session: { user } } }) },
    from: () => q,
  };
  const chat = load("lib/chat.ts", { "./supabase": { getSupabase: () => client, supabaseConfigured: true }, "./current-repo": currentRepo }, {
    fetch: async (url, init) => {
      asked.push([url, init && JSON.parse(init.body)]);
      return { ok: joinStatus === 200, status: joinStatus, json: async () => joinBody };
    },
    localStorage: { getItem: () => null, setItem() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
  });
  return { chat, asked };
}

test("chat checks membership once per repo, and # general without asking", async () => {
  const { chat, asked } = chatWith(200);
  await chat.loadMessages("GI-04/CoCommit");
  await chat.loadMessages("GI-04/CoCommit");
  await chat.loadMessages("general");
  assert.deepEqual(asked, [["/api/chat/join", { repo: "GI-04/CoCommit" }]]);
});

test("a closed repo chat throws NotMemberError with the server's reason, and retries next time", async () => {
  const { chat, asked } = chatWith(403, { error: access.NOT_MEMBER });
  await assert.rejects(chat.loadMessages("secret/repo"), (e) => e instanceof chat.NotMemberError && e.message === access.NOT_MEMBER);
  await assert.rejects(chat.sendMessage("secret/repo", "hi"), chat.NotMemberError);
  assert.equal(asked.length, 2);
});
