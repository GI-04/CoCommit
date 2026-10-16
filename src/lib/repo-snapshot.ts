// Unpacks GitHub's .tar.gz of a branch into { path, size, text } entries, for the @cocommit bot.
// Server only (uses node:zlib). No tar package: GitHub's tarballs are plain ustar with pax headers.
//
//   const files = parseTarball(await downloadTarball("GI-04/CoCommit", "main"));
//   files.find((f) => f.path === "README.md")?.text

import { gunzipSync } from "node:zlib";

/** text is null for binary files and for files over MAX_TEXT_BYTES (their size is still known). */
export type RepoFile = { path: string; size: number; text: string | null };

export const MAX_TEXT_BYTES = 1_000_000;

/** A NUL byte in the first 8 KB means binary (same rule git uses). */
export function looksBinary(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 8000);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true;
  return false;
}

const field = (block: Buffer, start: number, length: number) => {
  const raw = block.subarray(start, start + length);
  const end = raw.indexOf(0);
  return raw.subarray(0, end === -1 ? raw.length : end).toString("utf8");
};

/** "<len> key=value\n" records of a pax header. */
function paxPath(data: Buffer): string | null {
  let at = 0;
  while (at < data.length) {
    const space = data.indexOf(0x20, at);
    if (space === -1) break;
    const len = Number(data.subarray(at, space).toString());
    if (!(len > 0)) break;
    const record = data.subarray(space + 1, at + len - 1).toString("utf8"); // drop the trailing \n
    if (record.startsWith("path=")) return record.slice(5);
    at += len;
  }
  return null;
}

/** Every regular file in the tarball, with GitHub's "<owner>-<repo>-<sha>/" top folder removed. */
export function parseTar(tar: Buffer): RepoFile[] {
  const files: RepoFile[] = [];
  let next: string | null = null; // path from a pax "x" header, for the entry after it
  for (let at = 0; at + 512 <= tar.length; ) {
    const header = tar.subarray(at, at + 512);
    if (header.every((b) => b === 0)) break; // end of archive
    const size = parseInt(field(header, 124, 12).trim() || "0", 8);
    const type = String.fromCharCode(header[156] || 0x30);
    const body = tar.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;

    if (type === "x") {
      next = paxPath(body);
      continue;
    }
    if (type === "g" || type === "5") continue; // global header (commit id), folders
    const name = next ?? [field(header, 345, 155), field(header, 0, 100)].filter(Boolean).join("/");
    next = null;
    if (type !== "0" && type !== "\0") continue; // links and other special entries
    const path = name.split("/").slice(1).join("/");
    if (!path) continue;
    const text = size > MAX_TEXT_BYTES || looksBinary(body) ? null : body.toString("utf8");
    files.push({ path, size, text });
  }
  return files;
}

export const parseTarball = (gz: Buffer) => parseTar(gunzipSync(gz));
