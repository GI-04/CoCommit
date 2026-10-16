import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Drive folders and big files end to end (PLAN/2026-10-16-drive-folders.md): the browser helpers in files.ts talk to the
// real github.ts in fake mode, through a stand-in for POST /api/github/<name> that also checks Vercel's 4.5 MB body limit.
function load(path, imports, extra = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/lib/${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Buffer, Promise, JSON, Map, Set, Math, Number, Array, String, Error,
    console: { warn() {}, log: console.log, error: console.error },
    require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    ...extra,
  });
  return exports;
}

const BODY_LIMIT = 4.5 * 1024 * 1024;
const util = load("files-util.ts", {});
const gitModes = load("git-modes.ts", {});

function setup() {
  const github = load(
    "github.ts",
    {
      "node:crypto": crypto,
      "next/headers": { cookies: async () => ({ get: () => undefined }) },
      "./git-modes": gitModes,
      "./login-identity": { hasGitHubIdentity: () => false },
      "./supabase-server": { getSupabaseServer: async () => null },
      "./files-util": util,
    },
    { process: { env: {} }, globalThis: {} },
  );
  const bodies = [];
  const call = (name) => async (...args) => {
    const body = JSON.stringify(args);
    bodies.push({ name, size: body.length });
    assert.ok(body.length < BODY_LIMIT, `${name} sent ${body.length} bytes, over Vercel's limit`);
    const out = JSON.stringify((await github.actions[name](...JSON.parse(body))) ?? null);
    assert.ok(out.length < BODY_LIMIT, `${name} answered ${out.length} bytes, over Vercel's limit`);
    return JSON.parse(out);
  };
  const client = {
    commitFiles: call("commitFiles"),
    downloadFile: call("downloadFile"),
    listSharedFiles: call("listSharedFiles"),
    uploadPart: call("uploadPart"),
  };
  const saved = [];
  const browser = {
    btoa, atob, Uint8Array, Blob,
    URL: { createObjectURL: (blob) => (saved.push(blob), "blob:test"), revokeObjectURL() {} },
    document: { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } },
    setTimeout: () => 0,
  };
  const files = load(
    "files.ts",
    { "./workspace": { PREFIX: "COCOMMIT:", workspaceBranch: async () => "main" }, "./github-client": client, "./files-util": util },
    browser,
  );
  return { files, bodies, saved, github };
}

const REPO = "demo/drive-test";
const bytes = (n, seed = 7) => Uint8Array.from({ length: n }, (_, i) => (i * 31 + seed) % 251);
const asFile = (name, data) => new File([data], name);

test("folders: make, upload into, list, and delete with everything inside", async () => {
  const { files } = setup();
  let listing = await files.listShared(REPO);
  assert.deepEqual(listing, { files: [], markers: [] });

  const designs = await files.createSharedFolder(REPO, "", "Designs", listing);
  assert.equal(designs, "Designs");
  listing = await files.listShared(REPO);
  assert.deepEqual(listing.markers, ["COCOMMIT/files/Designs/.keep"]);
  assert.deepEqual([...util.folderView(listing, "").folders].map((f) => f.path), ["Designs"]);

  await assert.rejects(files.createSharedFolder(REPO, "", "designs", listing), /already here/);
  await assert.rejects(files.createSharedFolder(REPO, "", " // ", listing), /Type a folder name/);
  await assert.rejects(files.createSharedFolder(REPO, "a/b/c/d", "e", listing), /at most 4 levels/);

  const logos = await files.createSharedFolder(REPO, designs, "logos", listing);
  listing = await files.listShared(REPO);
  const saved = await files.uploadSharedFile(REPO, asFile("logo.svg", bytes(100)), logos, listing);
  assert.equal(saved.path, "COCOMMIT/files/Designs/logos/logo.svg");
  await files.uploadSharedFile(REPO, asFile("top.txt", bytes(10)), "", await files.listShared(REPO));
  listing = await files.listShared(REPO);
  assert.deepEqual([...util.folderView(listing, "Designs/logos").files].map((f) => f.name), ["logo.svg"]);

  // A file can't take a folder's name in the same place.
  const clash = await files.uploadSharedFile(REPO, asFile("Designs", bytes(5)), "", listing);
  assert.equal(clash.name, "Designs (2)");

  await files.deleteSharedFolder(REPO, designs, await files.listShared(REPO));
  listing = await files.listShared(REPO);
  assert.deepEqual(listing.markers, []);
  assert.deepEqual([...listing.files].map((f) => f.path).sort(), ["COCOMMIT/files/Designs (2)", "COCOMMIT/files/top.txt"]);
});

test("big files go up and come down in pieces, byte for byte", async () => {
  const { files, bodies, saved } = setup();
  const size = 8 * 1024 * 1024 + 123;
  const data = bytes(size, 3);
  const progress = [];
  const file = await files.uploadSharedFile(REPO, asFile("video.mp4", data), "", await files.listShared(REPO), (d, t) => progress.push(`${d}/${t}`));
  assert.deepEqual(progress, ["0/3", "1/3", "2/3", "3/3"]);
  assert.deepEqual(bodies.map((b) => b.name), ["listSharedFiles", "uploadPart", "uploadPart", "uploadPart", "commitFiles"]);

  const listed = (await files.listShared(REPO)).files.find((f) => f.path === file.path);
  assert.equal(listed.size, size);

  await files.saveSharedFile(REPO, file);
  const back = new Uint8Array(await saved[0].arrayBuffer());
  assert.equal(back.length, size);
  assert.ok(Buffer.from(back).equals(Buffer.from(data)), "downloaded bytes differ");
  assert.equal(bodies.filter((b) => b.name === "downloadFile").length, 3);
});

test("a small file is still one request each way", async () => {
  const { files, bodies, saved } = setup();
  const data = bytes(2 * 1024 * 1024);
  const file = await files.uploadSharedFile(REPO, asFile("small.png", data), "", { files: [], markers: [] });
  await files.saveSharedFile(REPO, file);
  assert.deepEqual(bodies.map((b) => b.name), ["commitFiles", "downloadFile"]);
  assert.ok(Buffer.from(new Uint8Array(await saved[0].arrayBuffer())).equals(Buffer.from(data)));
});

test("limits: over 50 MB is refused before upload; the server refuses bad pieces and paths", async () => {
  const { files, bodies, github } = setup();
  const huge = { name: "huge.zip", size: util.MAX_FILE_BYTES + 1, arrayBuffer: async () => new ArrayBuffer(0) };
  await assert.rejects(files.uploadSharedFile(REPO, huge, "", { files: [], markers: [] }), /limit is 50.0 MB/);
  assert.equal(bodies.length, 0);

  const big = Buffer.alloc(util.PART_BYTES + 1).toString("base64");
  await assert.rejects(github.uploadPart(REPO, big), /at most 3 MB/);
  await assert.rejects(github.uploadPart(REPO, "not base64!"), /base64/);
  await assert.rejects(github.commitFiles(REPO, "main", [{ path: "README.md", content: "", parts: ["a".repeat(40)] }], "x"), /Only Drive files/);
  await assert.rejects(github.commitFiles(REPO, "main", [{ path: "COCOMMIT/files/a.bin", content: "", parts: ["nope"] }], "x"), /blob ids/);
  await assert.rejects(github.downloadFile(REPO, "COCOMMIT/files/../README.md"), /Not a shared file/);
  await assert.rejects(github.downloadFile(REPO, "COCOMMIT/files/a.bin", -1), /piece number/);
});
