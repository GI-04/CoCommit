// Shared files for browser code (PLAN/2026-10-16-files.md, PLAN/2026-10-16-drive-folders.md): upload, list, download
// and delete files and folders in the repo's COCOMMIT/files/ folder, through the normal git code.
// Pure helpers (names, limits, folder paths) are in files-util.ts.

import { PREFIX, workspaceBranch } from "./workspace";
import { commitFiles, downloadFile, listSharedFiles, uploadPart, type FileEdit, type SharedFile, type SharedListing } from "./github-client";
import {
  cleanFolderName,
  cleanName,
  FILES_FOLDER,
  FOLDER_MARKER,
  folderView,
  formatSize,
  MAX_FILE_BYTES,
  MAX_FOLDER_DEPTH,
  PART_BYTES,
  pathsInFolder,
  sharedPath,
  uniqueName,
} from "./files-util";

export type { SharedFile, SharedListing } from "./github-client";

/** Called while a big file goes up or comes down: `done` of `total` pieces. */
export type Progress = (done: number, total: number) => void;

export const listShared = (repo: string): Promise<SharedListing> => listSharedFiles(repo);

const relative = (path: string) => path.slice(FILES_FOLDER.length + 1);

function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

/** A commit entry holding `bytes` at `path`; big files go up in pieces first. */
async function editFor(repo: string, path: string, bytes: Uint8Array, onProgress?: Progress): Promise<FileEdit> {
  if (bytes.length <= PART_BYTES) return { path, content: toBase64(bytes), encoding: "base64" };
  const total = Math.ceil(bytes.length / PART_BYTES);
  const parts: string[] = [];
  for (let i = 0; i < total; i++) {
    onProgress?.(i, total);
    parts.push((await uploadPart(repo, toBase64(bytes.subarray(i * PART_BYTES, (i + 1) * PART_BYTES)))).sha);
  }
  onProgress?.(total, total);
  return { path, content: "", parts };
}

/**
 * Commits `file` into `folder` of COCOMMIT/files/ (a taken name becomes "name (2).ext").
 * Files over PART_BYTES go up in pieces first. Throws an Error with a plain message.
 */
export async function uploadSharedFile(repo: string, file: File, folder: string, listing: SharedListing, onProgress?: Progress): Promise<SharedFile> {
  if (file.size === 0) throw new Error(`${file.name} is empty.`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is ${formatSize(file.size)}; the limit is ${formatSize(MAX_FILE_BYTES)}.`);
  const here = folderView(listing, folder);
  const name = uniqueName(cleanName(file.name), [...here.files.map((f) => f.name), ...here.folders.map((f) => f.name)]);
  const path = sharedPath(folder, name);
  const edit = await editFor(repo, path, new Uint8Array(await file.arrayBuffer()), onProgress);
  await commitFiles(repo, await workspaceBranch(repo), [edit], `${PREFIX} share ${relative(path)}`);
  return { name, folder, path, size: file.size };
}

/** Makes folder `rawName` inside `parent` (an empty hidden .keep file, since git keeps no empty folders). Returns its path. */
export async function createSharedFolder(repo: string, parent: string, rawName: string, listing: SharedListing): Promise<string> {
  const name = cleanFolderName(rawName);
  if (!name) throw new Error("Type a folder name (letters, numbers, spaces, - or _).");
  if ((parent ? parent.split("/").length : 0) >= MAX_FOLDER_DEPTH) throw new Error(`Folders go at most ${MAX_FOLDER_DEPTH} levels deep.`);
  const here = folderView(listing, parent);
  if ([...here.files, ...here.folders].some((x) => x.name.toLowerCase() === name.toLowerCase())) throw new Error(`“${name}” is already here.`);
  const folder = parent ? `${parent}/${name}` : name;
  await commitFiles(repo, await workspaceBranch(repo), [{ path: sharedPath(folder, FOLDER_MARKER), content: "" }], `${PREFIX} new folder ${folder}`);
  return folder;
}

export async function deleteSharedFile(repo: string, file: SharedFile): Promise<void> {
  await commitFiles(repo, await workspaceBranch(repo), [{ path: file.path, content: null }], `${PREFIX} remove ${relative(file.path)}`);
}

/** Removes `folder` and everything in it, in one commit. */
export async function deleteSharedFolder(repo: string, folder: string, listing: SharedListing): Promise<void> {
  const paths = pathsInFolder(listing, folder);
  if (paths.length === 0) return;
  await commitFiles(repo, await workspaceBranch(repo), paths.map((path) => ({ path, content: null })), `${PREFIX} remove folder ${folder}`);
}

/** Fetches the file's bytes (piece by piece when it's big). */
export async function fetchSharedChunks(repo: string, file: SharedFile, onProgress?: Progress): Promise<Uint8Array<ArrayBuffer>[]> {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let total = 1;
  for (let part = 0; part < total; part++) {
    const data = await downloadFile(repo, file.path, part);
    if (!data) throw new Error(`${file.name} is no longer in the repo.`);
    total = data.parts;
    if (total > 1) onProgress?.(part + 1, total);
    chunks.push(Uint8Array.from(atob(data.content), (c) => c.charCodeAt(0)));
  }
  return chunks;
}

/** Renames a file in one commit (the name is cleaned; a taken name becomes "name (2).ext"). Returns the renamed file. */
export async function renameSharedFile(repo: string, file: SharedFile, rawName: string, listing: SharedListing, onProgress?: Progress): Promise<SharedFile> {
  const here = folderView(listing, file.folder);
  const taken = [...here.files.filter((f) => f.path !== file.path).map((f) => f.name), ...here.folders.map((f) => f.name)];
  const name = uniqueName(cleanName(rawName), taken);
  if (name === file.name) return file;
  const path = sharedPath(file.folder, name);
  const chunks = await fetchSharedChunks(repo, file, onProgress);
  const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  const edit = await editFor(repo, path, bytes, onProgress);
  await commitFiles(repo, await workspaceBranch(repo), [{ path: file.path, content: null }, edit], `${PREFIX} rename ${relative(file.path)} to ${relative(path)}`);
  return { ...file, name, path };
}

/** Fetches the file and hands it to the browser as a download. */
export async function saveSharedFile(repo: string, file: SharedFile, onProgress?: Progress): Promise<void> {
  const url = URL.createObjectURL(new Blob(await fetchSharedChunks(repo, file, onProgress)));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
