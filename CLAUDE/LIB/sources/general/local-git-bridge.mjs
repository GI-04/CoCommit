// Test bridge for src/lib/local-git.ts: the same 12 commands as the Rust contract
// (BOARD/2026-10-15-local-git-rust.md), with the same guards, over HTTP on :4020.
// POST /<command> with a JSON body of args → 200 stdout, or 400 error text.
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";

const git = (cwd, args, okCodes = [0]) =>
  new Promise((resolve, reject) => {
    execFile("git", args, { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, maxBuffer: 20e6 }, (err, stdout, stderr) => {
      const code = err ? (typeof err.code === "number" ? err.code : 1) : 0;
      okCodes.includes(code) ? resolve(stdout) : reject(new Error((stderr || stdout || String(err)).trim()));
    });
  });

async function repoRoot(repo) {
  if (typeof repo !== "string" || !path.isAbsolute(repo)) throw new Error("repo must be an absolute path");
  if (!statSync(repo, { throwIfNoEntry: false })?.isDirectory()) throw new Error("repo folder not found");
  return (await git(repo, ["rev-parse", "--show-toplevel"])).trim();
}
function checkFile(root, f) {
  if (typeof f !== "string" || !f || path.isAbsolute(f) || f.startsWith("-") || f.split(/[\\/]/).includes(".."))
    throw new Error(`refused path: ${f}`);
  const full = path.resolve(root, f);
  if (!full.startsWith(root + path.sep)) throw new Error(`refused path: ${f}`);
  return f;
}
const files = (root, list) => {
  if (!Array.isArray(list) || !list.length) throw new Error("files must be a non-empty list");
  return list.map((f) => checkFile(root, f));
};
async function checkBranch(root, b) {
  if (typeof b !== "string" || !b || b.startsWith("-")) throw new Error(`refused branch: ${b}`);
  await git(root, ["check-ref-format", "--branch", b]);
  return b;
}

const commands = {
  git_check: async ({ repo }) => repoRoot(repo),
  git_status: async ({ repo }) => git(await repoRoot(repo), ["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"]),
  git_remote_url: async ({ repo }) => git(await repoRoot(repo), ["remote", "get-url", "origin"]),
  git_diff: async ({ repo, file, mode }) => {
    const root = await repoRoot(repo);
    const f = checkFile(root, file);
    if (mode === "staged") return git(root, ["diff", "--cached", "--", f]);
    if (mode === "unstaged") return git(root, ["diff", "--", f]);
    if (mode === "untracked") return git(root, ["diff", "--no-index", "--", "/dev/null", f], [0, 1]);
    throw new Error("mode must be staged, unstaged or untracked");
  },
  git_stage: async ({ repo, files: fs }) => { const r = await repoRoot(repo); return git(r, ["add", "--", ...files(r, fs)]); },
  git_unstage: async ({ repo, files: fs }) => { const r = await repoRoot(repo); return git(r, ["restore", "--staged", "--", ...files(r, fs)]); },
  git_discard: async ({ repo, files: fs }) => { const r = await repoRoot(repo); return git(r, ["restore", "--", ...files(r, fs)]); },
  git_commit: async ({ repo, message }) => {
    if (typeof message !== "string" || !message.trim()) throw new Error("message is empty");
    return git(await repoRoot(repo), ["commit", "-m", message]);
  },
  git_pull: async ({ repo }) => git(await repoRoot(repo), ["pull", "--ff-only"]),
  git_push: async ({ repo }) => git(await repoRoot(repo), ["push", "-u", "origin", "HEAD"]),
  git_branches: async ({ repo }) => git(await repoRoot(repo), ["branch", "--format=%(refname:short)"]),
  git_switch: async ({ repo, branch, create }) => {
    const r = await repoRoot(repo);
    const b = await checkBranch(r, branch);
    return git(r, create ? ["switch", "-c", b] : ["switch", b]);
  },
};

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.end();
  let raw = "";
  for await (const c of req) raw += c;
  const name = req.url.slice(1);
  try {
    if (!Object.hasOwn(commands, name)) throw new Error(`unknown command ${name}`);
    const out = await commands[name](JSON.parse(raw || "{}"));
    res.writeHead(200, { "Content-Type": "text/plain" }).end(out);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "text/plain" }).end(e.message);
  }
}).listen(4020, "127.0.0.1", () => console.log("git bridge on :4020"));
