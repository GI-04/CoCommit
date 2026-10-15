// Parses `git status --porcelain=v2 --branch -z --untracked-files=all` into lists a UI can show.
// Pure text in, data out (no imports), so it runs the same in the browser and in Node tests.

export type ChangeCode = "M" | "A" | "D" | "R" | "C" | "T" | "U";
export type FileChange = { path: string; code: ChangeCode; origPath?: string };

export type GitStatus = {
  branch: string | null; // null = detached HEAD
  upstream: string | null; // e.g. "origin/main"
  ahead: number;
  behind: number;
  staged: FileChange[]; // in the index, ready to commit
  unstaged: FileChange[]; // tracked files changed but not staged
  untracked: string[];
  conflicted: string[];
};

const code = (c: string): ChangeCode => ("MADRCTU".includes(c) ? (c as ChangeCode) : "M");

export function parseStatus(raw: string): GitStatus {
  const s: GitStatus = { branch: null, upstream: null, ahead: 0, behind: 0, staged: [], unstaged: [], untracked: [], conflicted: [] };
  const records = raw.split("\0");
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r) continue;
    if (r.startsWith("# branch.head ")) {
      const head = r.slice("# branch.head ".length);
      s.branch = head === "(detached)" ? null : head;
    } else if (r.startsWith("# branch.upstream ")) {
      s.upstream = r.slice("# branch.upstream ".length);
    } else if (r.startsWith("# branch.ab ")) {
      const m = r.match(/\+(\d+) -(\d+)/);
      if (m) [s.ahead, s.behind] = [Number(m[1]), Number(m[2])];
    } else if (r.startsWith("1 ") || r.startsWith("2 ")) {
      // "1 XY sub mH mI mW hH hI path"; "2 XY sub mH mI mW hH hI Xscore path" then the original path as the next record
      const renamed = r.startsWith("2 ");
      const parts = r.split(" ");
      const xy = parts[1];
      const path = parts.slice(renamed ? 9 : 8).join(" ");
      const origPath = renamed ? records[++i] : undefined;
      if (xy[0] !== ".") s.staged.push({ path, code: code(xy[0]), ...(origPath ? { origPath } : {}) });
      if (xy[1] !== ".") s.unstaged.push({ path, code: code(xy[1]) });
    } else if (r.startsWith("u ")) {
      s.conflicted.push(r.split(" ").slice(10).join(" "));
    } else if (r.startsWith("? ")) {
      s.untracked.push(r.slice(2));
    }
  }
  return s;
}

/** "git@github.com:owner/repo.git" or "https://github.com/owner/repo(.git)" → "owner/repo"; null if not GitHub. */
export function githubRepoFromRemote(url: string): string | null {
  const m = url.trim().match(/github\.com[:/]+([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  return m ? `${m[1]}/${m[2]}` : null;
}
