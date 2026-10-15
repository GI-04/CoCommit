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

// The navigation as in Figma: Messages groups Chat, Team (/tasks) and Call (/calls), so it is active on all three.
// `blurb` is the line on the Home card.
export const navItems: { href: string; title: string; icon: IconName; match: string[]; blurb: string }[] = [
  { href: "/home", title: "Home", icon: "home", match: ["/home"], blurb: "" },
  { href: "/repo", title: "Repository", icon: "branch", match: ["/repo"], blurb: "Commit and open pull requests with buttons." },
  { href: "/files", title: "Drive", icon: "folder", match: ["/files"], blurb: "Upload and share files with the team; saved in the repo." },
  { href: "/chat", title: "Messages", icon: "message", match: ["/chat", "/tasks", "/calls"], blurb: "Chat, team tasks and calls with your team." },
  { href: "/context", title: "Agent Context", icon: "bot", match: ["/context"], blurb: "One shared COCOMMIT.md for every teammate's AI agent." },
];
