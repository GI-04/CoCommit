// A small made-up team for Home when GitHub says "not logged in" (PLAN/2026-10-18-home-ux-fixes.md), so a first-time
// visitor sees what the cards do instead of a wall of "Log in". Every card that shows it carries a "Demo" tag.
// Dates are worked out from `now`, so the bars, heat map, today and streak always look current.
import type { Activity, Member } from "./context";
import type { CommitDate } from "./heatmap";
import type { Board } from "./tasks";
import type { Task, TaskStatus } from "./tasks-text";

const PEOPLE = ["Mai", "Ton", "Pim", "Kai"] as const;
const DAY = 86_400_000;

// Commits per day for the last 91 days, newest last: quiet weekends, a busy final week, at least one commit every day
// of the last 5 (so the streak shows). Fixed numbers, not random, so tests and screenshots stay the same.
const PATTERN = [
  0, 1, 0, 2, 0, 0, 1, 0, 2, 1, 0, 0, 0, 1, 3, 0, 1, 2, 0, 0, 0, 2, 1, 0, 3, 1, 0, 0, 1, 2, 2, 0, 1, 0, 0, 0, 3, 1, 2, 0,
  1, 0, 0, 2, 4, 1, 0, 2, 0, 0, 1, 3, 2, 2, 1, 0, 0, 0, 2, 4, 3, 1, 2, 0, 0, 3, 2, 5, 1, 2, 0, 1, 2, 4, 3, 2, 3, 0, 0, 4,
  5, 3, 6, 2, 1, 2, 4, 6, 3, 5, 2,
];

export function demoCommits(now: Date): CommitDate[] {
  const out: CommitDate[] = [];
  PATTERN.forEach((count, i) => {
    const day = new Date(now.getTime() - (PATTERN.length - 1 - i) * DAY);
    for (let n = 0; n < count; n++) {
      // Spread through the working day; never later than `now` on today.
      const at = new Date(day);
      at.setHours(10 + ((i + n * 3) % 8), (n * 17) % 60, 0, 0);
      if (at > now) at.setTime(now.getTime() - (n + 1) * 60_000);
      out.push({ author: PEOPLE[(i + n) % PEOPLE.length], at: at.toISOString() });
    }
  });
  return out;
}

const MEMBERS: Member[] = [
  { title: "Claude-Mai", name: "Mai", role: "Frontend", capability: "", availability: "", writeScope: "" },
  { title: "Claude-Ton", name: "Ton", role: "Backend", capability: "", availability: "", writeScope: "" },
  { title: "Codex-Pim", name: "Pim", role: "Design", capability: "", availability: "", writeScope: "" },
  { title: "Claude-Kai", name: "Kai", role: "Desktop app", capability: "", availability: "", writeScope: "" },
];

const TASKS: [TaskStatus, string, string][] = [
  ["pending", "Dark mode for the settings page", "anyone"],
  ["pending", "Write the demo script", "Pim"],
  ["taken", "Sign in with email", "Ton"],
  ["taken", "Phone layout for chat", "Mai"],
  ["done", "Upload files to Drive", "Kai"],
  ["done", "Task board on Home", "Mai"],
  ["done", "Commit button on Repository", "Ton"],
];

const FOLDER: Record<TaskStatus, string> = { pending: "Pending", taken: "Taken", done: "Done" };

export function demoBoard(repo: string): Board {
  const tasks: Task[] = TASKS.map(([status, title, who], i) => {
    const file = `2026-10-1${i % 7}-demo-${i}.md`;
    return {
      path: `COCOMMIT/BOARD/${FOLDER[status]}/${file}`,
      file,
      status,
      title,
      to: status === "pending" ? who : "anyone",
      from: "Mai",
      created: "",
      what: "",
      acceptance: [],
      owner: status === "pending" ? "" : who,
      progress: "",
      blockers: "",
      verifiedBy: "",
      handoff: "",
      text: "",
    };
  });
  return { repo, branch: "main", tasks, members: MEMBERS };
}

export function demoActivity(now: Date): Activity[] {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  return [
    { kind: "commit", author: "Mai", text: "Phone layout for chat: bigger send button", at: ago(12) },
    { kind: "pinned", author: "Ton", text: "Decision: email login needs no confirmation for the demo", at: ago(48) },
    { kind: "pr", author: "Kai", text: "merged #12 Upload files to Drive", at: ago(95) },
    { kind: "commit", author: "Pim", text: "New icons for the sidebar", at: ago(180) },
    { kind: "commit", author: "Ton", text: "Sign in with email: reset password page", at: ago(60 * 22) },
    { kind: "pr", author: "Mai", text: "merged #11 Task board on Home", at: ago(60 * 26) },
    { kind: "commit", author: "Kai", text: "Desktop app opens links in the browser", at: ago(60 * 49) },
  ];
}
