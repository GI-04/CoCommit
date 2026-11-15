import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Login identity (PLAN/2026-10-15-login-identity.md): pure sign-in helpers and the chat posting rules,
// run with a fake Supabase client. No network, no real accounts.
function load(file, imports, extra = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/lib/${file}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, URL, URLSearchParams, console, crypto, process: { env: {} },
    require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    }, ...extra,
  });
  return exports;
}

const id = load("login-identity", {});
const githubUser = { identities: [{ provider: "github" }], app_metadata: { provider: "github", providers: ["github"] } };
const googleUser = { identities: [{ provider: "google" }], app_metadata: { provider: "google", providers: ["google"] } };

test("returnTo only allows same-site paths", () => {
  assert.equal(id.safeReturnTo("/chat"), "/chat");
  assert.equal(id.safeReturnTo("/repo?x=1"), "/repo?x=1");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "", null, undefined]) assert.equal(id.safeReturnTo(bad), "/repo");
  assert.equal(id.safeReturnTo(null, "/home"), "/home");
});

test("returnTo refuses the tricks browsers turn into another site", () => {
  // Browsers read "\" as "/" and drop tabs/newlines, so each of these would land on evil.example.
  for (const bad of ["/\t/evil.example", "/\n/evil.example", "/\r\n/evil.example", "/\\/evil.example", "/x\\..\\..\\evil", "/\u0000/evil.example", "/\u007f/x", 42, {}]) {
    assert.equal(id.safeReturnTo(bad, "/home"), "/home", JSON.stringify(bad));
  }
  // Ordinary paths, queries, hashes and encoded characters stay as they are.
  for (const good of ["/", "/chat#general", "/repo?x=1&y=/z", "/files/a%20b", "/%2F%2Fevil.example", "/tasks/é"]) {
    assert.equal(id.safeReturnTo(good, "/home"), good);
  }
});

test("the callback URL carries the return page and the GitHub marker", () => {
  const url = new URL(id.githubCallbackUrl("https://cocommit.vercel.app", "/chat"));
  assert.equal(url.origin + url.pathname, "https://cocommit.vercel.app/auth/callback");
  assert.equal(url.searchParams.get("next"), "/chat");
  assert.equal(url.searchParams.get("provider"), "github");
  assert.equal(new URL(id.githubCallbackUrl("http://localhost:3000", "//evil.example")).searchParams.get("next"), "/repo");
  assert.equal(id.GITHUB_SCOPES, "repo read:user");
});

test("a desktop sign-in carries the app window's challenge, and only a well-formed one", () => {
  const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
  const url = new URL(id.githubCallbackUrl("https://cocommit.vercel.app", "/chat", true, challenge));
  assert.equal(url.searchParams.get("desktop"), "1");
  assert.equal(url.searchParams.get("challenge"), challenge);
  for (const bad of [null, undefined, "", "short", `${challenge}&next=//evil`]) {
    assert.equal(new URL(id.githubCallbackUrl("https://cocommit.vercel.app", "/chat", true, bad)).searchParams.get("challenge"), null);
  }
  // A web sign-in never carries one.
  assert.equal(new URL(id.githubCallbackUrl("https://cocommit.vercel.app", "/chat", false, challenge)).searchParams.get("challenge"), null);
});

test("the GitHub cookie only counts when it is the signed-in account's own GitHub", () => {
  const octo = { identities: [{ provider: "github", id: "583231", identity_data: { provider_id: "583231", sub: "583231", user_name: "octocat" } }] };
  assert.equal(id.githubIdOf(octo), "583231");
  assert.equal(id.githubIdOf({ identities: [{ provider: "github", id: "77" }] }), "77");
  assert.equal(id.githubIdOf(googleUser), null);
  assert.equal(id.githubIdOf(null), null);
  assert.equal(id.sameGitHubAccount(octo, 583231), true);
  assert.equal(id.sameGitHubAccount(octo, "583231"), true);
  assert.equal(id.sameGitHubAccount(octo, 1), false);
  assert.equal(id.sameGitHubAccount(octo, null), false);
  // An email or Google account with someone's GitHub cookie: not the same account.
  assert.equal(id.sameGitHubAccount(googleUser, 583231), false);
  assert.equal(id.sameGitHubAccount({ identities: [] }, 583231), false);
});

test("Get started: the app when signed in or in demo mode, else the login page", () => {
  assert.equal(id.getStartedHref({ account: false, github: false, demo: false }), "/login?returnTo=/home");
  assert.equal(id.getStartedHref({ account: true, github: false, demo: false }), "/home");
  assert.equal(id.getStartedHref({ account: false, github: true, demo: false }), "/home");
  assert.equal(id.getStartedHref({ account: false, github: false, demo: true }), "/home");
});

test("only a GitHub sign-in's token is kept", () => {
  const session = (user, token = "gho_abc") => ({ provider_token: token, user });
  assert.equal(id.githubTokenFromSession("github", session(githubUser)), "gho_abc");
  // Google returns a provider_token too: never store it as the GitHub token.
  assert.equal(id.githubTokenFromSession("github", session(googleUser, "ya29.google")), null);
  // Email links and Google sign-ins don't carry our marker.
  assert.equal(id.githubTokenFromSession(null, session(githubUser)), null);
  assert.equal(id.githubTokenFromSession("google", session(githubUser)), null);
  // No token, no session.
  assert.equal(id.githubTokenFromSession("github", session(githubUser, null)), null);
  assert.equal(id.githubTokenFromSession("github", null), null);
  // An email user who just linked GitHub (identities list both).
  const linked = { identities: [{ provider: "email" }, { provider: "github" }], app_metadata: { provider: "email", providers: ["email", "github"] } };
  assert.equal(id.githubTokenFromSession("github", session(linked)), "gho_abc");
});

test("GitHub identity is read from server-set fields only", () => {
  assert.equal(id.hasGitHubIdentity(githubUser), true);
  assert.equal(id.hasGitHubIdentity(googleUser), false);
  assert.equal(id.hasGitHubIdentity(null), false);
  // user_metadata is user-editable, so it must not count.
  assert.equal(id.hasGitHubIdentity({ identities: [{ provider: "email" }], app_metadata: { provider: "email" }, user_metadata: { user_name: "pattadon", provider: "github" } }), false);
});

// ---------- Chat posting rules

function chatWith(user, { insertError = null, row = {} } = {}) {
  const inserts = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user } }),
      getSession: async () => ({ data: { session: user ? { user } : null } }),
      signInAnonymously: async () => ({ error: null }),
    },
    from: () => ({
      insert: (value) => {
        inserts.push(value);
        return {
          select: () => ({
            single: async () => (insertError
              ? { data: null, error: insertError }
              : { data: { id: "m1", repo: value.repo, author: "Alice Real", text: value.text, kind: value.kind, pinned: false, created_at: "2026-10-15T00:00:00Z", author_login: "alice", ...row }, error: null }),
          }),
        };
      },
    }),
  };
  const chat = load("chat", { "./current-repo": { GENERAL: "general" }, "./supabase": { getSupabase: () => client, supabaseConfigured: true } }, {
    fetch: async () => ({ ok: true, json: async () => ({ user: null, fake: false }) }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });
  return { chat, inserts };
}

const real = { id: "u1", is_anonymous: false, email: "alice@example.com", user_metadata: { full_name: "Alice" } };
const anon = { id: "u2", is_anonymous: true, user_metadata: {} };

test("anonymous visitors can't post; nothing reaches the database", async () => {
  const { chat, inserts } = chatWith(anon);
  assert.equal(await chat.canPost(), false);
  await assert.rejects(chat.sendMessage("GI-04/CoCommit", "hi"), (e) => e.message === chat.LOGIN_TO_CHAT);
  assert.equal(inserts.length, 0);
});

test("a signed-in member posts, and the verified login comes back from the database", async () => {
  const { chat, inserts } = chatWith(real);
  assert.equal(await chat.canPost(), true);
  const m = await chat.sendMessage("GI-04/CoCommit", "  hello  ");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].text, "hello");
  // The browser's author is only a hint; the database's answer is what the message shows.
  assert.equal(m.author, "Alice Real");
  assert.equal(m.authorLogin, "alice");
});

test("old rows without author_login still load", async () => {
  const { chat } = chatWith(real, { row: { author_login: undefined } });
  const m = await chat.sendMessage("GI-04/CoCommit", "hi");
  assert.equal(m.authorLogin, null);
});

test("a database refusal reads as 'log in', not a cryptic error", async () => {
  const { chat } = chatWith(real, { insertError: { code: "42501", message: "new row violates row-level security policy" } });
  await assert.rejects(chat.sendMessage("GI-04/CoCommit", "hi"), (e) => e.message === chat.LOGIN_TO_CHAT);
});

test("names: account name first, never a picked name", async () => {
  assert.equal(await chatWith(real).chat.myName(), "Alice");
  const gh = { id: "u3", is_anonymous: false, user_metadata: { user_name: "kinkin" } };
  assert.equal(await chatWith(gh).chat.myName(), "kinkin");
  assert.equal(typeof chatWith(real).chat.setMyName, "undefined");
});

test("demo mode (no Supabase keys) still lets anyone post locally", async () => {
  const chat = load("chat", { "./current-repo": { GENERAL: "general" }, "./supabase": { getSupabase: () => null, supabaseConfigured: false } }, {
    fetch: async () => ({ ok: true, json: async () => ({ user: null, fake: true }) }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });
  assert.equal(await chat.canPost(), true);
});
