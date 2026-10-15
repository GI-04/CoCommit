import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";

// Run browser helpers with controlled auth/database boundaries; no account or network writes.
function load(file, imports, extra = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/lib/${file.endsWith(".tsx") ? file : file + ".ts"}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, URL, Event, console, process: { env: {} },
    require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    }, ...extra,
  });
  return exports;
}
const user = (extra = {}) => ({
  id: "user-a", email: "a@example.com", created_at: "2026-10-15T00:00:00Z", is_anonymous: false,
  identities: [{ provider: "email" }], app_metadata: { provider: "email" },
  user_metadata: { full_name: "Alice", avatar_url: "https://example.com/alice.png" }, ...extra,
});
function fixture({ account = user(), github = { user: null, fake: false }, missing = false, authError = null, mirrorError = null, updateError = null, reauthError = null } = {}) {
  let current = account;
  const updates = [], mirrors = [], events = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: current }, error: authError }),
      updateUser: async (attributes, options) => {
        updates.push({ attributes, options });
        if (updateError) return { data: { user: null }, error: updateError };
        current = { ...current, user_metadata: { ...current.user_metadata, ...attributes.data }, ...(attributes.email ? { new_email: attributes.email } : {}) };
        return { data: { user: current }, error: null };
      },
      signInWithPassword: async () => ({ data: { user: current }, error: reauthError }),
    },
    from: (table) => ({ update: (value) => ({ eq: (column, id) => ({ select: () => ({ maybeSingle: async () => {
      mirrors.push({ table, value, column, id });
      return { data: mirrorError ? null : { id }, error: mirrorError };
    } }) }) }) }),
  };
  const api = load("profile", {
    "./auth-email": { friendly: (e) => e.message, MIN_PASSWORD_LENGTH: 8 },
    "./github-client": { getSession: async () => { if (github instanceof Error) throw github; return github; } },
    "./supabase": { getSupabase: () => missing ? null : client },
  }, { window: { location: { origin: "https://cocommit.example" }, dispatchEvent: (e) => events.push(e.type) } });
  return { api, updates, mirrors, events, client, setUser: (u) => { current = u; } };
}

test("signed-out, anonymous and fake accounts are never shown as real profiles", async () => {
  for (const account of [null, user({ is_anonymous: true })]) {
    const { api } = fixture({ account, github: { user: { login: "demo" }, fake: true } });
    const result = await api.loadAccounts();
    assert.equal(result.profile, null); assert.equal(result.github, null); assert.equal(result.warnings.length, 0);
  }
  assert.equal((await fixture({ missing: true }).api.loadAccounts()).profile, null);
});
test("GitHub-only, Supabase-only and dual sessions remain distinct", async () => {
  const github = { user: { login: "git-person", name: "Git Person", avatarUrl: "https://example.com/git.png" }, fake: false };
  const onlyGit = await fixture({ account: null, github }).api.loadAccounts();
  assert.equal(onlyGit.profile, null); assert.equal(onlyGit.github.login, "git-person");
  const onlySupa = await fixture().api.loadAccounts();
  assert.equal(onlySupa.profile.name, "Alice"); assert.equal(onlySupa.github, null);
  const both = await fixture({ github }).api.loadAccounts();
  assert.equal(both.profile.id, "user-a"); assert.equal(both.github.login, "git-person");
});
test("provider accounts cannot acquire password controls by editing user metadata", () => {
  const { api } = fixture();
  assert.equal(api.profileFromUser(user({ identities: [{ provider: "google" }], user_metadata: { provider: "email" } })).emailAccount, false);
});
test("missing session is signed out; provider outages stay visible and independent", async () => {
  const missing = await fixture({ account: null, authError: { name: "AuthSessionMissingError" } }).api.loadAccounts();
  assert.equal(missing.warnings.length, 0);
  const outage = await fixture({ github: new Error("offline") }).api.loadAccounts();
  assert.equal(outage.profile.name, "Alice"); assert.equal(outage.warnings.length, 1);
  const authOutage = await fixture({ authError: { name: "AuthRetryableFetchError" } }).api.loadAccounts();
  assert.equal(authOutage.profile, null); assert.equal(authOutage.warnings.length, 1);
});
test("invalid profile fields never reach auth or the public table", async () => {
  const { api, updates, mirrors } = fixture();
  for (const [name, avatar] of [["   ", ""], ["x".repeat(81), ""], ["Alice", "javascript:alert(1)"], ["Alice", "http://example.com/photo.png"], ["Alice", "https://user:secret@example.com/x"]]) {
    await assert.rejects(api.saveProfile(name, avatar));
  }
  assert.equal(updates.length, 0); assert.equal(mirrors.length, 0);
});
test("save/reload persists profile, removes avatar, and mirrors only own public fields", async () => {
  const { api, updates, mirrors, events } = fixture();
  const result = await api.saveProfile("  New Alice  ", "");
  assert.equal(result.profile.name, "New Alice"); assert.equal(result.profile.avatarUrl, "");
  assert.equal(result.warning, null);
  const reloaded = await api.loadAccounts();
  assert.equal(reloaded.profile.name, "New Alice"); assert.equal(reloaded.profile.avatarUrl, "");
  assert.equal(mirrors[0].id, "user-a"); assert.equal(mirrors[0].column, "id");
  assert.deepEqual(Object.keys(mirrors[0].value).sort(), ["avatar_url", "name"]);
  assert.equal(updates[0].attributes.data.full_name, "New Alice");
  assert.deepEqual(events, ["cocommit:profile-changed"]);
});
test("anonymous users cannot save and failed auth saves do not write table or emit success", async () => {
  await assert.rejects(fixture({ account: user({ is_anonymous: true }) }).api.saveProfile("A", ""), /Log in/);
  const f = fixture({ updateError: { message: "Save refused" } });
  await assert.rejects(f.api.saveProfile("A", ""), /Save refused/);
  assert.equal(f.mirrors.length, 0); assert.equal(f.events.length, 0);
});
test("a mirror failure reports partial sync while keeping saved profile available", async () => {
  const f = fixture({ mirrorError: { message: "table missing" } });
  const result = await f.api.saveProfile("Saved Alice", "");
  assert.match(result.warning, /profile is saved/);
  assert.equal((await f.api.loadAccounts()).profile.name, "Saved Alice");
});
test("email changes require password reauthentication, preserve current email until confirmed", async () => {
  const f = fixture();
  const next = await f.api.changeEmail(" new@example.com ", "current-password");
  assert.equal(next.email, "a@example.com"); assert.equal(next.pendingEmail, "new@example.com");
  assert.equal(f.updates[0].options.emailRedirectTo, "https://cocommit.example/auth/callback?next=/profile");
  assert.equal(f.mirrors.length, 0);
  const bad = fixture({ reauthError: { message: "Wrong password" } });
  await assert.rejects(bad.api.changeEmail("new@example.com", "wrong"), /Wrong password/);
  assert.equal(bad.updates.length, 0);
});
test("invalid email, weak password, blank current password and provider-only accounts cannot update credentials", async () => {
  const f = fixture();
  await assert.rejects(f.api.changeEmail("invalid", "password"), /valid email/);
  await assert.rejects(f.api.changePassword("current", "tiny"), /at least 8/);
  await assert.rejects(f.api.changePassword("", "strong-new-password"), /current password/);
  const provider = fixture({ account: user({ identities: [{ provider: "google" }] }) });
  await assert.rejects(provider.api.changePassword("current", "new-password"), /sign-in provider/);
  assert.equal(f.updates.length, 0); assert.equal(provider.updates.length, 0);
});
test("password changes write only auth credentials, never public profile data", async () => {
  const f = fixture();
  await f.api.changePassword("current", "long-new-password");
  assert.equal(f.updates[0].attributes.password, "long-new-password");
  assert.equal(f.mirrors.length, 0);
});
test("future chat messages use fresh profile names, then GitHub or guest fallback", async () => {
  let account = user();
  const api = load("chat", { "./supabase": { supabaseConfigured: true, getSupabase: () => ({ auth: { getUser: async () => ({ data: { user: account } }) } }) } }, {
    fetch: async () => ({ ok: true, json: async () => ({ user: { login: "git-person" }, fake: false }) }),
    sessionStorage: { getItem: () => "Guest 123" },
  });
  assert.equal(await api.myName(), "Alice");
  account = user({ user_metadata: { full_name: "Changed Alice" } });
  assert.equal(await api.myName(), "Changed Alice");
  account = user({ is_anonymous: true });
  assert.equal(await api.myName(), "git-person");
});
test("combined sign-out reports either provider's failure", async () => {
  const api = load("auth-email", {
    "./supabase": { getSupabase: () => ({ auth: { signOut: async () => ({ error: null }) } }) },
    "./github-client": { signOutOfGitHub: async () => { throw new Error("offline"); } },
  });
  assert.match((await api.signOut()).error, /Couldn't sign out/);
});

function renderProfileState(accounts, loading = false, tab = "account") {
  let hook = 0;
  // useState calls of the page, in order: accounts, loading, signingOut, notice, tab (the forms live on the Account tab).
  const initial = [accounts, loading, false, null, tab];
  const react = {
    useState: (value) => [hook < initial.length ? initial[hook++] : (hook++, typeof value === "function" ? value() : value), () => {}],
    useRef: (current) => ({ current }), useCallback: (fn) => fn, useEffect: () => {},
  };
  const ui = load("../components/ui.tsx", { "react/jsx-runtime": jsxRuntime });
  const page = load("../app/profile/page.tsx", {
    react, "react/jsx-runtime": jsxRuntime,
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
    "@/components/Avatar": { Avatar: ({ name }) => React.createElement("span", {}, name.slice(0, 1)) },
    "@/components/ui": ui,
    "@/components/icons": { Icon: () => null },
    "@/components/profile/Overview": { ProfileOverview: () => null },
    "@/lib/auth-email": { MIN_PASSWORD_LENGTH: 8 },
    "@/lib/profile": {}, "@/lib/supabase": {},
  });
  return renderToStaticMarkup(React.createElement(page.default));
}

test("profile UI has intentional loading/signed-out states and returning login link", () => {
  assert.match(renderProfileState(null, true), /Loading your account/);
  assert.doesNotMatch(renderProfileState(null, true), /Make yourself at home/);
  const signedOut = renderProfileState({ profile: null, github: null, warnings: [] });
  assert.match(signedOut, /login\?returnTo=\/profile/);
  assert.doesNotMatch(signedOut, /Current password/);
});
test("profile UI exposes editable saved details and email controls only for email accounts", () => {
  const { api } = fixture();
  const profile = api.profileFromUser(user());
  const html = renderProfileState({ profile, github: null, warnings: [] });
  assert.match(html, /value="Alice"/);
  assert.match(html, /Photo URL/);
  assert.match(html, /Change email/);
  assert.match(html, /Change password/);
  assert.match(html, /aria-describedby="password-help"/);
  const google = renderProfileState({ profile: { ...profile, emailAccount: false }, github: null, warnings: [] });
  assert.doesNotMatch(google, /Current password/);
  assert.match(google, /sign-in provider/);
});
test("GitHub-only UI points to provider settings; dual accounts are labelled separately", () => {
  const github = { login: "git-person", name: "Git Person", avatarUrl: "" };
  const html = renderProfileState({ profile: null, github, warnings: [] });
  assert.match(html, /Edit profile on GitHub/);
  assert.match(html, /https:\/\/github.com\/settings\/profile/);
  assert.doesNotMatch(html, /Save changes/);
  const { api } = fixture();
  const both = renderProfileState({ profile: api.profileFromUser(user()), github, warnings: [] });
  assert.match(both, /separate signed-in accounts/);
  assert.match(both, /Save changes/);
});
