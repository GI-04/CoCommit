import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Chat privacy (PLAN/2026-10-16-chat-privacy-get-started.md): only real accounts read, pin or listen, and chat
// never signs anyone in anonymously. Runs chat.ts with a fake Supabase client that records every call.
function load(imports, extra) {
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/chat.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, console, crypto, setTimeout,
    require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    }, ...extra,
  });
  return exports;
}

function chatAs(user) {
  const calls = [];
  const query = (table) => {
    const q = {
      select: () => (calls.push(`select ${table}`), q),
      update: () => (calls.push(`update ${table}`), q),
      eq: () => q,
      order: () => q,
      limit: async () => ({ data: [{ id: "m1", repo: "GI-04/CoCommit", author: "Alice", text: "hi", kind: "text", pinned: false, created_at: "2026-10-16T00:00:00Z" }], error: null }),
      then: (ok) => ok({ error: null }),
    };
    return q;
  };
  const client = {
    auth: {
      getUser: async () => ({ data: { user } }),
      getSession: async () => ({ data: { session: user ? { user } : null } }),
      signInAnonymously: async () => (calls.push("signInAnonymously"), { error: null }),
    },
    from: (table) => query(table),
    channel: (name) => {
      calls.push(`channel ${name}`);
      const ch = { on: () => ch, subscribe: () => ch, track: async () => {}, presenceState: () => ({}) };
      return ch;
    },
    removeChannel: () => {},
  };
  const chat = load({ "./supabase": { getSupabase: () => client, supabaseConfigured: true } }, {
    fetch: async () => ({ ok: true, json: async () => ({ user: null, fake: false }) }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
  });
  return { chat, calls };
}

const real = { id: "u1", is_anonymous: false, email: "alice@example.com", user_metadata: { full_name: "Alice" } };
const anon = { id: "u2", is_anonymous: true, user_metadata: {} };
const tick = () => new Promise((r) => setTimeout(r, 0));

for (const [who, user] of [["signed-out visitors", null], ["old anonymous sessions", anon]]) {
  test(`${who} can't read, pin or listen, and are never signed in anonymously`, async () => {
    const { chat, calls } = chatAs(user);
    assert.equal(await chat.canPost(), false);
    const login = (e) => e instanceof chat.NotSignedInError && e.message === chat.LOGIN_TO_CHAT;
    await assert.rejects(chat.loadMessages("GI-04/CoCommit"), login);
    await assert.rejects(chat.listPinned("GI-04/CoCommit"), login);
    await assert.rejects(chat.pinMessage("m1"), login);
    chat.subscribe("GI-04/CoCommit", () => {})();
    chat.onlineUsers("GI-04/CoCommit", () => {})();
    await tick();
    assert.deepEqual(calls, []);
  });
}

test("a real account reads the repo's messages and listens live", async () => {
  const { chat, calls } = chatAs(real);
  const list = await chat.loadMessages("GI-04/CoCommit");
  assert.equal(list.length, 1);
  assert.equal(list[0].author, "Alice");
  const stop = chat.subscribe("GI-04/CoCommit", () => {});
  await tick();
  stop();
  assert.deepEqual(calls, ["select messages", "channel messages:GI-04/CoCommit"]);
});
