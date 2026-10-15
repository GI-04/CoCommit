// COCOMMIT.md: one shared context file per repo that every teammate's AI agent
// reads first. This module only turns text into data and back; reading and
// writing the file on GitHub goes through readContext / writeContext in ./github.ts.

export const CONTEXT_PATH = "COCOMMIT.md";

export const SECTIONS = ["Current state", "Who works on what", "Decisions", "Next step", "Recent activity"] as const;

const NOTE =
  "<!-- Maintained by CoCommit. AI agents: read this file before starting work, and update \"Next step\" when you finish. -->";

export type Section = { heading: string; body: string };
export type ContextDoc = { title: string; sections: Section[] };
export type Activity = { kind: "commit" | "pr" | "pinned"; author: string; text: string; at: string };

export function template(project: string): string {
  return renderContext({
    title: `${project} — team context`,
    sections: SECTIONS.map((heading) => ({ heading, body: heading === "Recent activity" ? "" : "_Not written yet._" })),
  });
}

export function parseContext(md: string): ContextDoc {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const title = lines.find((l) => l.startsWith("# "))?.slice(2).trim() ?? "Team context";
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      current = { heading: line.slice(3).trim(), body: "" };
      sections.push(current);
    } else if (current) {
      current.body += line + "\n";
    }
  }
  for (const s of sections) s.body = s.body.trim();

  // Make sure every standard section exists, so the screen can always edit it.
  for (const heading of SECTIONS) {
    if (!sections.some((s) => same(s.heading, heading))) sections.push({ heading, body: "" });
  }
  return { title, sections };
}

export function renderContext(doc: ContextDoc): string {
  const parts = [`# ${doc.title}`, NOTE, ...doc.sections.map((s) => `## ${s.heading}\n${s.body}`.trimEnd())];
  return parts.join("\n\n") + "\n";
}

export function getSection(doc: ContextDoc, heading: string): string {
  return doc.sections.find((s) => same(s.heading, heading))?.body ?? "";
}

export function updateSection(doc: ContextDoc, heading: string, body: string): ContextDoc {
  const exists = doc.sections.some((s) => same(s.heading, heading));
  const sections = exists
    ? doc.sections.map((s) => (same(s.heading, heading) ? { ...s, body: body.trim() } : s))
    : [...doc.sections, { heading, body: body.trim() }];
  return { ...doc, sections };
}

// Newest first, no duplicates, capped so the file stays short enough for agents to read.
export function addRecentActivity(doc: ContextDoc, items: Activity[], limit = 15): ContextDoc {
  const old = getSection(doc, "Recent activity")
    .split("\n")
    .filter((l) => l.startsWith("- "));
  // Lines start with "- YYYY-MM-DD HH:MM", so sorting the text sorts by time.
  const lines = [...new Set([...items.map(activityLine), ...old])].sort().reverse().slice(0, limit);
  return updateSection(doc, "Recent activity", lines.join("\n"));
}

export function activityLine(a: Activity): string {
  const when = a.at.slice(0, 16).replace("T", " ");
  return `- ${when} · ${a.author} · ${a.kind}: ${a.text.replace(/\s+/g, " ").trim()}`;
}

// One line for a repo's CLAUDE.md / AGENTS.md so every agent finds COCOMMIT.md.
export const AGENT_POINTER = `Read \`${CONTEXT_PATH}\` first: it is this team's shared context (state, owners, decisions, next step).`;

export function withAgentPointer(instructions: string): string {
  if (instructions.includes(CONTEXT_PATH)) return instructions;
  return instructions.trim() ? `${AGENT_POINTER}\n\n${instructions}` : `${AGENT_POINTER}\n`;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
