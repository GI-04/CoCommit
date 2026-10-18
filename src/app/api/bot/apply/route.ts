import { NextResponse } from "next/server";
import { assistantBranch, isExcluded, MAX_CHANGED_FILES, MAX_EDIT_BYTES, parsePatterns, type Change } from "@/lib/bot";
import { cleanPath } from "@/lib/bot-tools";
import { commitFiles, getSession, GitHubError, openPullRequest, resolveBranch } from "@/lib/github";

// POST /api/bot/apply { repo, base?, title, body?, changes: [{ path, content | null }], exclude? }
//   → { branch, commit, pr }
// "Create pull request" in the Assistant's Edit mode: one commit with the staged changes on a NEW branch
// assistant/<title>-<random>, made from `base` (the branch the Assistant read), then a pull request into `base`.
// It never commits to an existing branch. Uses the asker's own GitHub sign-in.

export const maxDuration = 120;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) return fail(415, "Send JSON.");
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const repo = typeof body.repo === "string" ? body.repo : "";
  const title = typeof body.title === "string" ? body.title.trim().replace(/\s+/g, " ").slice(0, 120) : "";
  const note = typeof body.body === "string" ? body.body.slice(0, 20_000) : "";
  const exclude = Array.isArray(body.exclude) ? body.exclude.filter((p): p is string => typeof p === "string") : parsePatterns(String(body.exclude ?? ""));
  if (!repo || !title) return fail(400, "Send { repo, title, changes }.");

  if (!Array.isArray(body.changes) || body.changes.length === 0) return fail(400, "There are no changes to commit.");
  if (body.changes.length > MAX_CHANGED_FILES) return fail(400, `At most ${MAX_CHANGED_FILES} files in one pull request.`);
  const changes: Change[] = [];
  for (const raw of body.changes as { path?: unknown; content?: unknown }[]) {
    const path = cleanPath(raw?.path);
    if (!path) return fail(400, "A change has no valid path.");
    if (isExcluded(path, exclude)) return fail(400, `${path} is in your "don't read" list.`);
    if (raw.content !== null && typeof raw.content !== "string") return fail(400, `${path}: content must be text or null.`);
    if (typeof raw.content === "string" && Buffer.byteLength(raw.content) > MAX_EDIT_BYTES) return fail(413, `${path} is over ${MAX_EDIT_BYTES / 1000} KB.`);
    if (changes.some((c) => c.path === path)) return fail(400, `${path} is listed twice.`);
    changes.push({ path, content: raw.content as string | null });
  }

  try {
    const session = await getSession();
    if (!session.user) return fail(401, "Log in with GitHub to create the pull request.");
    const base = await resolveBranch(repo, typeof body.base === "string" ? body.base.trim() : null);
    const head = assistantBranch(title);
    const message = `${title}\n\nMade with the CoCommit Assistant (Edit mode), reviewed and sent by ${session.user.login}.`;
    const commit = await commitFiles(repo, head, changes, message, base);
    const files = changes.map((c) => `- \`${c.path}\`${c.content === null ? " (deleted)" : ""}`).join("\n");
    const pr = await openPullRequest(
      repo,
      head,
      base,
      title,
      `${note ? `${note}\n\n` : ""}### Files\n${files}\n\n🤖 Made with the CoCommit Assistant (Edit mode) and sent by @${session.user.login} after reviewing the diff. Nothing was run or tested; please review before merging.`,
    ).catch((e: unknown) => {
      // The commit is already on the new branch: say where, so it can be opened by hand instead of committed twice.
      throw new GitHubError(e instanceof GitHubError ? e.status : 502, `Committed to ${head}, but opening the pull request failed: ${e instanceof GitHubError || e instanceof Error ? e.message : "unknown error"}. Open it on GitHub from that branch.`);
    });
    return NextResponse.json({ branch: head, commit, pr });
  } catch (e) {
    const status = e instanceof GitHubError ? e.status : 502;
    if (status >= 500) console.error("[bot/apply] failed", e);
    return fail(status, e instanceof GitHubError || e instanceof Error ? e.message : "Couldn't create the pull request.");
  }
}
