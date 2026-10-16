// Small helpers for the tools on Repository's file view: Copy, Download and Ask Assistant (PLAN/2026-10-16-overview-spines-file-tools.md).
// Pure, no imports.

export type FileKind = "file" | "diff";

/** What a downloaded copy is called: the last part of the path ("src/app/page.tsx" → "page.tsx"); a diff gets ".diff" added. */
export function downloadName(path: string, kind: FileKind = "file"): string {
  const last = String(path ?? "").split(/[\\/]+/).filter(Boolean).pop() ?? "";
  const name = last.replace(/[\u0000-\u001f<>:"|?*]+/g, "-").trim() || "file.txt";
  return kind === "diff" ? `${name}.diff` : name;
}

/** How much of a diff goes into the question: the Assistant can't compare branches, so the change itself is sent. */
export const PATCH_MAX = 6000;

/** The question "Ask Assistant" sends about the open file or change (for a change, the diff is included, cut at PATCH_MAX). */
export function fileQuestion(path: string, repo: string, branch: string, kind: FileKind = "file", patch = ""): string {
  const where = `${repo ? ` in ${repo}` : ""}${branch ? ` on the ${branch} branch` : ""}`;
  if (kind !== "diff") return `Explain \`${path}\`${where}: what it does and how it fits the rest of the project.`;
  const head = `Explain the changes to \`${path}\`${where}: what changed and what it could affect.`;
  const diff = String(patch ?? "");
  if (!diff.trim()) return head;
  return `${head}\n\nHere is the diff:\n\`\`\`diff\n${diff.slice(0, PATCH_MAX)}${diff.length > PATCH_MAX ? "\n… (cut here)" : ""}\n\`\`\``;
}

/** Copy and Download only make sense for text: not for an empty result (a binary or very large file) or one with broken characters. */
export function textProblem(text: string): string | null {
  if (!text) return "Empty, or too large or not a text file";
  if (text.includes("\ufffd")) return "Not a text file";
  return null;
}
