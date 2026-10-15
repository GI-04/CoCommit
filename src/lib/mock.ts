// Fake data so the screens work before the real libs land.
// Shapes follow the board tasks: github.ts (Proud) and supabase.ts (Kin).
// Swap these out for the real calls when they're ready.

export type Repo = { fullName: string; defaultBranch: string };
export type Change = {
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  patch: string;
};
export type ChatMessage = {
  id: string;
  repo: string;
  author: string;
  text: string;
  kind: "text" | "git_event";
  pinned: boolean;
  createdAt: string;
};

export const me = "Pattadon";

export const repos: Repo[] = [
  { fullName: "GI-04/CoCommit", defaultBranch: "main" },
  { fullName: "GI-04/demo-todo-app", defaultBranch: "main" },
];

export const branches = ["main", "layout-and-screens", "chat-backend", "github-git-buttons"];

export const changes: Change[] = [
  {
    path: "src/app/page.tsx",
    status: "modified",
    additions: 3,
    deletions: 1,
    patch: `@@ -1,5 +1,7 @@
 export default function Home() {
-  return <h1>Hello</h1>;
+  return (
+    <h1>Welcome to CoCommit</h1>
+  );
 }`,
  },
  {
    path: "src/components/Button.tsx",
    status: "added",
    additions: 6,
    deletions: 0,
    patch: `@@ -0,0 +1,6 @@
+export function Button({ children }) {
+  return (
+    <button className="btn">{children}</button>
+  );
+}
+`,
  },
  {
    path: "notes/old-idea.md",
    status: "deleted",
    additions: 0,
    deletions: 2,
    patch: `@@ -1,2 +0,0 @@
-# Old idea
-Use Discord for everything.`,
  },
];

// Fixed times, so the server and the browser render the same text.
const base = Date.parse("2026-10-15T07:00:00Z");
const t = (min: number) => new Date(base - min * 60_000).toISOString();

export const messages: ChatMessage[] = [
  { id: "1", repo: "GI-04/CoCommit", author: "Kin", text: "Chat table is up on Supabase 🎉", kind: "text", pinned: false, createdAt: t(42) },
  { id: "2", repo: "GI-04/CoCommit", author: "Proud", text: "Working on GitHub sign-in now", kind: "text", pinned: true, createdAt: t(30) },
  { id: "3", repo: "GI-04/CoCommit", author: "Proud", text: "committed “Add OAuth callback” to github-git-buttons", kind: "git_event", pinned: false, createdAt: t(12) },
  { id: "4", repo: "GI-04/CoCommit", author: "Pattadon", text: "Nice! I'll hook the Repo screen to it next", kind: "text", pinned: false, createdAt: t(5) },
];

export const online = ["Pattadon", "Proud", "Kin"];

export const contextFile = `# COCOMMIT.md

## Current state
Skeleton merged. Layout and screens in progress with fake data. GitHub sign-in and chat backend being built.

## Who works on what
- Pattadon + Claude-Pattadon: layout, screens, AI context
- Proud: GitHub sign-in, git buttons
- Kin: chat backend, desktop builds

## Decisions
- Demo: git buttons, chat, AI context. Web + macOS + Windows.
- Desktop app loads the deployed web URL.

## Next step
Connect the Repo screen to the real GitHub API.
`;
