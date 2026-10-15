import type { IconName } from "@/components/icons";

// `label` is the short name other code uses; `title` and `icon` are what the navigation and Home cards show.
export const sections: { href: string; label: string; title: string; icon: IconName; blurb: string }[] = [
  { href: "/repo", label: "Repo", title: "Repository", icon: "branch", blurb: "Commit and open pull requests with buttons." },
  { href: "/chat", label: "Chat", title: "Chat", icon: "message", blurb: "Talk with the team; git events show up here." },
  { href: "/context", label: "Context", title: "Agent Context", icon: "bot", blurb: "One shared COCOMMIT.md for every teammate's AI agent." },
  { href: "/calls", label: "Calls", title: "Calls", icon: "phone", blurb: "Voice, video and screen sharing without leaving CoCommit." },
  { href: "/tasks", label: "Tasks", title: "Tasks", icon: "tasks", blurb: "Assign and track tasks; every move is a commit." },
  { href: "/files", label: "Files", title: "Files", icon: "folder", blurb: "Upload and share files with the team; saved in the repo." },
];

export const comingSoon: { href: string; label: string }[] = [];
