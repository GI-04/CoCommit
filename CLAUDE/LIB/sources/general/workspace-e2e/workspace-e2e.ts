import assert from "node:assert/strict";
const BASE = "http://localhost:3300";
const MOCK = "http://127.0.0.1:4011";
const real = globalThis.fetch;
let cookie = "";

// Sign in through the app's own routes (login → mock GitHub → callback), keeping cookies.
async function hop(path: string) {
  const res = await real(BASE + path, { redirect: "manual", headers: { cookie } });
  for (const c of res.headers.getSetCookie()) cookie = [cookie, c.split(";")[0]].filter(Boolean).join("; ");
  return res;
}
const login = await hop("/api/github/login?returnTo=/context");
const state = new URL(login.headers.get("location")!).searchParams.get("state");
await hop(`/api/github/callback?code=good-code&state=${state}`);
assert.match(cookie, /cc_github=/, "signed in");

// Browser-style relative fetches go to the dev server with our cookie.
globalThis.fetch = ((u: string, init: RequestInit = {}) =>
  real(u.startsWith("/") ? BASE + u : u, { ...init, headers: { ...(init.headers as object), cookie } })) as typeof fetch;

const ws = await import(new URL("../../../../../src/lib/workspace.ts", import.meta.url).href);
const repo = "acme/app";
const state0 = async () => (await real(MOCK + "/__state")).json();

assert.equal(await ws.loadWorkspace(repo), null, "not set up yet");
assert.equal(await ws.workspaceBranch(repo), "main");

const me = { title: "Pattadon", name: "Pattadon", role: "full stack", capability: "all", availability: "hackathon", writeScope: "anything" };
const c1 = await ws.setUpWorkspace(repo, { project: "Acme App", what: "Demo repo.", members: [me], by: "Pattadon", date: "2026-10-15" });
assert.equal(c1.branch, "main");
let s = await state0();
assert.equal(s.history[0].commit.message, "COCOMMIT: set up team context");
assert.ok(s.files["CLAUDE.md"].startsWith("@COCOMMIT/CONTEXT.md") && s.files["CLAUDE.md"].includes("Be nice."), "kept old CLAUDE.md");
assert.ok("COCOMMIT/BOARD/Pending/.gitkeep" in s.files);

let w = (await ws.loadWorkspace(repo))!;
assert.equal(w.collab[0].title, "Pattadon");
assert.equal(w.handoff.by, "Pattadon");

await ws.saveHandoff(repo, { ...w.handoff, next: "Record the demo video." });
await ws.addDecisionTo(repo, { date: "2026-10-15", title: "GitHub sign-in only", decision: "No Google wall", why: "one login" });
await ws.addGotchaTo(repo, { date: "2026-10-15", title: "Build cache", whatFailed: "env ignored", evidence: "fake:true", workaround: "--force" });
await ws.saveMember(repo, { ...me, title: "Claude-Pattadon", name: "Claude Opus 5.5", role: "agent" });
await ws.saveTodo(repo, { backlog: [{ text: "Demo video", done: false }], questions: ["Which repo?"] });
assert.equal(await ws.saveTodo(repo, { backlog: [{ text: "Demo video", done: false }], questions: ["Which repo?"] }), null, "unchanged → no commit");

w = (await ws.loadWorkspace(repo))!;
assert.equal(w.handoff.next, "Record the demo video.");
assert.deepEqual(w.decisions, ["2026-10-15 — GitHub sign-in only"]);
assert.deepEqual(w.gotchas, ["2026-10-15 — Build cache"]);
assert.deepEqual(w.collab.map((m: { title: string }) => m.title), ["Pattadon", "Claude-Pattadon"]);
assert.deepEqual(w.todo.backlog, [{ text: "Demo video", done: false }]);

const before = (await state0()).commitPosts;
const logCommit = await ws.refreshLog(repo);
assert.ok(logCommit, "log updated");
w = (await ws.loadWorkspace(repo))!;
assert.ok(w.log.some((l: string) => l.includes("proud — commit: Add chat backend")));
assert.ok(w.log.some((l: string) => l.includes("pr: merged #5: Chat backend")));
assert.ok(!w.log.some((l: string) => l.includes("COCOMMIT:")), "own commits skipped");
assert.equal(await ws.refreshLog(repo), null, "second refresh: nothing new");
s = await state0();
assert.equal(s.commitPosts, before + 1);

console.log(`workspace e2e passed: ${s.commitPosts} commits on mock GitHub`);
console.log(s.history.map((h: { commit: { message: string } }) => "  " + h.commit.message).join("\n"));
console.log("\nLOG.md:\n" + s.files["COCOMMIT/LOG.md"]);
