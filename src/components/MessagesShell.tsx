import type { ReactNode } from "react";
import { LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/ui";

const TABS = [
  { id: "chat", label: "Chat", href: "/chat" },
  { id: "team", label: "Team", href: "/tasks" },
  { id: "call", label: "Call", href: "/calls" },
];

// Figma "Messages": one title with Chat / Team / Call tabs. They are still three pages (/chat, /tasks, /calls), so
// this header is shared and the navigation shows Messages as active on all three. `fill` makes the content area
// take the rest of the screen height (the chat).
export function MessagesShell({ active, fill = false, children }: { active: "chat" | "team" | "call"; fill?: boolean; children: ReactNode }) {
  return (
    <div className={`max-w-6xl ${fill ? "flex h-[calc(100dvh-8.5rem)] flex-col md:h-[calc(100dvh-4rem)]" : ""}`}>
      <PageHeader title="Messages">
        <LinkTabs label="Messages" value={active} tabs={TABS} />
        <span className="hidden w-24 lg:block" aria-hidden />
      </PageHeader>
      <div className={fill ? "min-h-0 flex-1" : ""}>{children}</div>
    </div>
  );
}
