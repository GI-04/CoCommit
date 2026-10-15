// Shared files for browser code (PLAN/2026-10-16-files.md): upload, list, download and delete files in the repo's
// COCOMMIT/files/ folder, through the normal git code. Pure helpers (names, limits) are in files-util.ts.

import { PREFIX, workspaceBranch } from "./workspace";
import { commitFiles, downloadFile, listSharedFiles, type SharedFile } from "./github-client";
import { cleanName, FILES_FOLDER, MAX_FILE_BYTES, formatSize, uniqueName } from "./files-util";

export type { SharedFile } from "./github-client";

export const listShared = (repo: string): Promise<SharedFile[]> => listSharedFiles(repo);

function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

/** Commits `file` to COCOMMIT/files/ (a taken name becomes "name (2).ext"). Throws an Error with a plain message. */
export async function uploadSharedFile(repo: string, file: File, existing: SharedFile[]): Promise<SharedFile> {
  if (file.size === 0) throw new Error(`${file.name} is empty.`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is ${formatSize(file.size)}; the limit is ${formatSize(MAX_FILE_BYTES)}.`);
  const name = uniqueName(cleanName(file.name), existing.map((f) => f.name));
  const path = `${FILES_FOLDER}/${name}`;
  const content = toBase64(new Uint8Array(await file.arrayBuffer()));
  await commitFiles(repo, await workspaceBranch(repo), [{ path, content, encoding: "base64" }], `${PREFIX} share ${name}`);
  return { name, path, size: file.size };
}

export async function deleteSharedFile(repo: string, file: SharedFile): Promise<void> {
  await commitFiles(repo, await workspaceBranch(repo), [{ path: file.path, content: null }], `${PREFIX} remove ${file.name}`);
}

/** Fetches the file and hands it to the browser as a download. */
export async function saveSharedFile(repo: string, file: SharedFile): Promise<void> {
  const data = await downloadFile(repo, file.path);
  if (!data) throw new Error(`${file.name} is no longer in the repo.`);
  const bin = atob(data.content);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes]));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
