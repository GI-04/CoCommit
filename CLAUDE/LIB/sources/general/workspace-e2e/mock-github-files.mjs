// Stateful fake GitHub on :4011 for testing src/lib/workspace.ts: commits really change files,
// and contents/commits reflect them. Repo acme/app, default branch main. Based on proud's mock-github.mjs.
import { createServer } from "node:http";

const TOKEN = "mock-token-123";
const R = "/repos/acme/app";
let seq = 0;
const files = new Map([["CLAUDE.md", "# Existing rules\nBe nice.\n"]]); // path → text on main
const trees = new Map(); // tree sha → { base, changes: [{path, content|null}] }
const commits = new Map(); // commit sha → { tree, message, date }
const history = []; // newest first, for GET /commits
let head = "sha-main";
let commitPosts = 0;

const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};

createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  const m = req.method;
  if (p === "/__state") return send(res, 200, { files: Object.fromEntries(files), history, commitPosts });
  // Test setup without a commit: POST {"path": "text", …} adds or replaces files on main.
  if (m === "POST" && p === "/__seed") {
    for (const [path, text] of Object.entries(JSON.parse(raw || "{}"))) files.set(path, String(text));
    return send(res, 200, { files: [...files.keys()] });
  }
  if (p === "/login/oauth/access_token") return send(res, 200, { access_token: TOKEN });
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { message: "Bad credentials" });

  if (m === "GET" && p === "/user") return send(res, 200, { login: "mock-user", name: "Mock User", avatar_url: "http://gh/a.png" });
  if (m === "GET" && p === "/user/repos") return send(res, 200, [{ full_name: "acme/app", default_branch: "main", private: true, updated_at: "2026-10-15T00:00:00Z" }]);
  if (m === "GET" && p === R) return send(res, 200, { default_branch: "main" });
  if (m === "GET" && p.startsWith(`${R}/git/ref/heads/`)) {
    return p.endsWith("/main") ? send(res, 200, { object: { sha: head } }) : send(res, 404, { message: "Not Found" });
  }
  if (m === "GET" && p.startsWith(`${R}/git/commits/`)) return send(res, 200, { tree: { sha: `tree-of-${p.split("/").pop()}` } });
  // listFiles and commitFiles (file modes) read the whole tree; every file here is a plain file.
  if (m === "GET" && p.startsWith(`${R}/git/trees/`))
    return send(res, 200, { tree: [...files.keys()].map((path) => ({ path, mode: "100644", type: "blob" })), truncated: false });
  if (m === "POST" && p === `${R}/git/trees`) {
    const b = JSON.parse(raw);
    const sha = `tree-${++seq}`;
    trees.set(sha, { base: b.base_tree, changes: b.tree.map((t) => ({ path: t.path, content: t.sha === null ? null : t.content })) });
    return send(res, 201, { sha });
  }
  if (m === "POST" && p === `${R}/git/commits`) {
    const b = JSON.parse(raw);
    const sha = `commit-${++seq}`;
    commitPosts++;
    commits.set(sha, { tree: b.tree, message: b.message, date: new Date(Date.UTC(2026, 9, 15, 8, seq)).toISOString() });
    return send(res, 201, { sha, html_url: `http://gh/acme/app/commit/${sha}` });
  }
  if (m === "PATCH" && p === `${R}/git/refs/heads/main`) {
    const sha = JSON.parse(raw).sha;
    const c = commits.get(sha);
    for (const ch of trees.get(c.tree).changes) ch.content === null ? files.delete(ch.path) : files.set(ch.path, ch.content);
    history.unshift({ author: { login: "mock-user" }, commit: { message: c.message, author: { name: "Mock User", date: c.date } } });
    head = sha;
    return send(res, 200, {});
  }
  if (m === "GET" && p === `${R}/commits`) {
    const seed = [{ author: { login: "proud" }, commit: { message: "Add chat backend", author: { name: "proud", date: "2026-10-15T07:30:00Z" } } }];
    return send(res, 200, [...history, ...seed].slice(0, Number(url.searchParams.get("per_page") ?? 30)));
  }
  if (m === "GET" && p === `${R}/pulls` && url.searchParams.get("state") === "closed")
    return send(res, 200, [{ number: 5, title: "Chat backend", merged_at: "2026-10-15T07:40:00Z", user: { login: "proud" } }]);
  if (m === "GET" && p.startsWith(`${R}/contents/`)) {
    const path = p.slice(`${R}/contents/`.length);
    return files.has(path)
      ? send(res, 200, { type: "file", content: Buffer.from(files.get(path)).toString("base64") })
      : send(res, 404, { message: "Not Found" });
  }
  return send(res, 404, { message: `mock: no route for ${m} ${p}` });
}).listen(4011, "127.0.0.1", () => console.log("stateful mock GitHub on :4011"));
