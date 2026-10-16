// Drive live check (PLAN/2026-10-16-drive-folders.md): runs this checkout's real Drive code (src/lib/files.ts on top of
// src/lib/github.ts) against real GitHub, with no web server and no sign-in page. Uses your GitHub CLI login
// (`gh auth token`) or GITHUB_TOKEN; the token is never printed.
//
//   node scripts/drive-live-check.mjs <owner/repo> [size in MB, default 10]
//
// It makes a folder drive-check-<time> in the repo's COCOMMIT/files/ on the default branch, uploads a file of that size
// (in 3 MB pieces when it's over 3 MB) and a small one, downloads both and compares every byte, then deletes the folder.
// That's 4 real commits: use a throwaway repo unless the team agrees. Every request and answer must stay under
// Vercel's 4.5 MB, as on the live site. Exit code 1 when anything fails.

import { execFileSync } from "node:child_process";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const [repo, sizeArg] = process.argv.slice(2);
if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  console.error("Usage: node scripts/drive-live-check.mjs <owner/repo> [size in MB, default 10]");
  process.exit(2);
}
const sizeMB = Number(sizeArg ?? 10);
const token = process.env.GITHUB_TOKEN || execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
if (!token) throw new Error("No GitHub token: log in with `gh auth login` or set GITHUB_TOKEN.");

// The app keeps GitHub's token in an encrypted cookie; make one the same way github.ts reads it.
const secret = crypto.randomBytes(16).toString("hex");
const key = crypto.createHash("sha256").update(`cocommit-github-cookie:${secret}`).digest();
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
const cookie = Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");

function load(path, imports, extra = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/lib/${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Buffer, Promise, JSON, Map, Set, Math, Number, Array, String, Error, console,
    require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    ...extra,
  });
  return exports;
}

const util = load("files-util.ts", {});
const github = load(
  "github.ts",
  {
    "node:crypto": crypto,
    "next/headers": { cookies: async () => ({ get: (name) => (name === "cc_github" ? { value: cookie } : undefined) }) },
    "./git-modes": load("git-modes.ts", {}),
    "./login-identity": { hasGitHubIdentity: () => false },
    "./supabase-server": { getSupabaseServer: async () => null },
    "./files-util": util,
  },
  { fetch, encodeURIComponent, process: { env: { GITHUB_CLIENT_ID: "drive-live-check", GITHUB_CLIENT_SECRET: secret } }, globalThis: {} },
);

// Stand-in for POST /api/github/<name>: same JSON round trip, same 4.5 MB limit, with timings.
const LIMIT = 4.5 * 1024 * 1024;
const calls = [];
const call = (name) => async (...args) => {
  const sent = JSON.stringify(args);
  if (sent.length > LIMIT) throw new Error(`${name} would send ${sent.length} bytes: over Vercel's 4.5 MB limit`);
  const start = performance.now();
  const answer = JSON.stringify((await github.actions[name](...JSON.parse(sent))) ?? null);
  const ms = Math.round(performance.now() - start);
  const joins = name === "commitFiles" && args[2].some((f) => f.parts);
  calls.push({ name: joins ? "commitFiles+join" : name, ms, sent: sent.length, answered: answer.length });
  if (answer.length > LIMIT) throw new Error(`${name} would answer ${answer.length} bytes: over Vercel's 4.5 MB limit`);
  return JSON.parse(answer);
};

let saved = null;
const files = load(
  "files.ts",
  {
    "./workspace": { PREFIX: "COCOMMIT:", workspaceBranch: async () => (await github.listRepos()).find((r) => r.fullName.toLowerCase() === repo.toLowerCase())?.defaultBranch ?? "main" },
    "./github-client": {
      commitFiles: call("commitFiles"),
      downloadFile: call("downloadFile"),
      listSharedFiles: call("listSharedFiles"),
      uploadPart: call("uploadPart"),
    },
    "./files-util": util,
  },
  {
    btoa, atob, Uint8Array, Blob,
    URL: { createObjectURL: (blob) => ((saved = blob), "blob:check"), revokeObjectURL() {} },
    document: { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } },
    setTimeout: () => 0,
  },
);

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
const step = async (label, job) => {
  const start = performance.now();
  const out = await job();
  console.log(`✓ ${label} (${((performance.now() - start) / 1000).toFixed(1)} s)`);
  return out;
};
async function roundTrip(file, data) {
  saved = null;
  await files.saveSharedFile(repo, file);
  const back = Buffer.from(await saved.arrayBuffer());
  if (!back.equals(Buffer.from(data))) throw new Error(`${file.name}: downloaded ${back.length} bytes that differ from the ${data.length} sent`);
}

const user = (await github.getSession()).user;
if (!user) throw new Error("GitHub didn't accept the token.");
console.log(`Drive live check on ${repo} as @${user.login}, ${sizeMB} MB file\n`);

const folderName = `drive-check-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
let folder = null;
try {
  folder = await step(`made folder ${folderName}`, async () => files.createSharedFolder(repo, "", folderName, await files.listShared(repo)));
  let listing = await files.listShared(repo);
  if (!listing.markers.includes(util.sharedPath(folder, util.FOLDER_MARKER))) throw new Error("the new folder's .keep isn't in the listing");

  const big = new Uint8Array(crypto.randomBytes(Math.round(sizeMB * 1024 * 1024) + 321));
  const bigFile = await step(`uploaded big.bin, ${mb(big.length)} in ${util.partCount(big.length)} piece(s)`, () =>
    files.uploadSharedFile(repo, new File([big], "big.bin"), folder, listing),
  );
  const small = new TextEncoder().encode(`Drive live check ${new Date().toISOString()}\n`);
  const smallFile = await step("uploaded note.txt", async () => files.uploadSharedFile(repo, new File([small], "note.txt"), folder, await files.listShared(repo)));

  listing = await files.listShared(repo);
  const listed = listing.files.find((f) => f.path === bigFile.path);
  if (listed?.size !== big.length) throw new Error(`big.bin is listed as ${listed?.size} bytes, expected ${big.length}`);
  console.log(`✓ listed: ${util.folderView(listing, folder).files.map((f) => `${f.name} (${util.formatSize(f.size)})`).join(", ")}`);

  await step("downloaded big.bin, every byte the same", () => roundTrip(bigFile, big));
  await step("downloaded note.txt, every byte the same", () => roundTrip(smallFile, small));
} catch (e) {
  console.error(`✗ ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
} finally {
  if (folder) {
    try {
      await step(`deleted folder ${folder}`, async () => files.deleteSharedFolder(repo, folder, await files.listShared(repo)));
      const left = util.pathsInFolder(await files.listShared(repo), folder);
      if (left.length) throw new Error(`still there after delete: ${left.join(", ")}`);
      console.log("✓ folder gone from the listing");
    } catch (e) {
      console.error(`✗ cleanup: ${e instanceof Error ? e.message : e}`);
      process.exitCode = 1;
    }
  }
}

console.log("\nRequests (as the browser would send them to /api/github/<name>):");
for (const c of calls) console.log(`  ${c.name.padEnd(17)} ${String(c.ms).padStart(6)} ms   sent ${mb(c.sent).padStart(8)}   answer ${mb(c.answered).padStart(8)}`);
const join = calls.find((c) => c.name === "commitFiles+join");
if (join) console.log(`\nJoining the pieces on the server (commitFiles+join): ${(join.ms / 1000).toFixed(1)} s from this computer; the API route allows 60 s.`);
console.log(process.exitCode ? "\nFAILED" : "\nAll good.");
