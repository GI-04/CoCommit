// A tiny fake GitHub (OAuth + REST) on :4010 for testing src/lib/github.ts without a real token.
import { createServer } from "node:http";

const TOKEN = "mock-token-123";
const log = [];
const refs = new Map([["main", "sha-main"]]);
let prCount = 0;
const pr = { number: 7, html_url: "http://gh/acme/app/pull/7", title: "Add x", head: { ref: "feature/x" }, base: { ref: "main" } };

const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};

createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  if (p === "/__log") return send(res, 200, log);
  log.push({ m: req.method, u: req.url, auth: req.headers.authorization ?? null, ua: req.headers["user-agent"], body: raw || null });

  if (p === "/login/oauth/access_token") {
    const form = new URLSearchParams(raw);
    if (form.get("code") === "good-code" && form.get("client_secret") === "test-secret") return send(res, 200, { access_token: TOKEN });
    return send(res, 200, { error: "bad_verification_code", error_description: "The code passed is incorrect or expired." });
  }
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { message: "Bad credentials" });

  const R = "/repos/acme/app";
  const m = req.method;
  if (m === "GET" && p === "/user") return send(res, 200, { login: "mock-user", name: "Mock User", avatar_url: "http://gh/a.png" });
  if (m === "GET" && p === "/user/repos") return send(res, 200, [{ full_name: "acme/app", default_branch: "main", private: true, updated_at: "2026-10-15T00:00:00Z", extra: 1 }]);
  if (m === "GET" && p === R) return send(res, 200, { default_branch: "main" });
  if (m === "GET" && p === `${R}/branches`) return send(res, 200, [...refs.keys()].map((name) => ({ name })));
  if (m === "GET" && p === `${R}/compare/main...feature/x`)
    return send(res, 200, {
      files: [
        { filename: "gone.txt", status: "removed", additions: 0, deletions: 1, patch: "-bye" },
        { filename: "new-name.txt", status: "renamed", previous_filename: "old-name.txt", additions: 0, deletions: 0 },
        { filename: "add.txt", status: "added", additions: 1, deletions: 0, patch: "+hi" },
      ],
    });
  if (m === "GET" && p.startsWith(`${R}/git/ref/heads/`)) {
    const name = p.slice(`${R}/git/ref/heads/`.length);
    return refs.has(name) ? send(res, 200, { object: { sha: refs.get(name) } }) : send(res, 404, { message: "Not Found" });
  }
  if (m === "POST" && p === `${R}/git/refs`) {
    const b = JSON.parse(raw);
    refs.set(b.ref.replace("refs/heads/", ""), b.sha);
    return send(res, 201, { ref: b.ref });
  }
  if (m === "GET" && p.startsWith(`${R}/git/commits/`)) return send(res, 200, { tree: { sha: `tree-of-${p.split("/").pop()}` } });
  if (m === "POST" && p === `${R}/git/trees`) return send(res, 201, { sha: "tree-new" });
  if (m === "POST" && p === `${R}/git/commits`) return send(res, 201, { sha: "commit-new", html_url: "http://gh/acme/app/commit/commit-new" });
  if (m === "PATCH" && p.startsWith(`${R}/git/refs/heads/`)) {
    refs.set(p.slice(`${R}/git/refs/heads/`.length), JSON.parse(raw).sha);
    return send(res, 200, {});
  }
  if (m === "POST" && p === `${R}/pulls`) {
    prCount++;
    if (prCount === 1) return send(res, 201, pr);
    return send(res, 422, { message: "Validation Failed", errors: [{ message: "A pull request already exists for acme:feature/x." }] });
  }
  if (m === "GET" && p === `${R}/pulls`) {
    const ok = url.searchParams.get("head") === "acme:feature/x" && url.searchParams.get("base") === "main";
    return send(res, 200, ok ? [pr] : []);
  }
  if (m === "GET" && p === `${R}/contents/COCOMMIT.md`) return send(res, 200, { type: "file", content: Buffer.from("# COCOMMIT.md\nสวัสดี ✓\n").toString("base64") });
  if (m === "GET" && p.startsWith(`${R}/contents/`)) return send(res, 404, { message: "Not Found" });
  if (m === "GET" && p.startsWith(`${R}/git/trees/`))
    return send(res, 200, { tree: [{ path: "src", type: "tree" }, { path: "src/a.ts", type: "blob" }, { path: "README.md", type: "blob" }] });
  return send(res, 404, { message: `mock: no route for ${m} ${p}` });
}).listen(4010, "127.0.0.1", () => console.log("mock GitHub on :4010"));
