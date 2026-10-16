// Small helpers for the tools on Repository's file view: Copy, Download and Ask Assistant (PLAN/2026-10-16-overview-spines-file-tools.md).
// Pure, no imports.

export type FileKind = "file" | "diff";

/** What a downloaded copy is called: the last part of the path ("src/app/page.tsx" → "page.tsx"); a diff gets ".diff" added. */
export function downloadName(path: string, kind: FileKind = "file"): string {
  const last = String(path ?? "").split(/[\\/]+/).filter(Boolean).pop() ?? "";
  const name = last.replace(/[\u0000-\u001f<>:"|?*]+/g, "-").trim() || "file.txt";
  return kind === "diff" ? `${name}.diff` : name;
}

/** The question "Ask Assistant" sends about the open file or change. */
export function fileQuestion(path: string, repo: string, branch: string, kind: FileKind = "file"): string {
  const where = `${repo ? ` in ${repo}` : ""}${branch ? ` on the ${branch} branch` : ""}`;
  return kind === "diff"
    ? `Explain the changes to \`${path}\`${where}: what changed and what it could affect.`
    : `Explain \`${path}\`${where}: what it does and how it fits the rest of the project.`;
}
