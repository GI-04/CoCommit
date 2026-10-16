// The team list as people with their agents hanging under them (Agent Context → Team and Messages → Team → Members).
// Pure functions, no React: PLAN/2026-10-16-glass-buttons-spines.md.

import type { Member } from "./context";

export type TeamTone = "pink" | "cyan" | "mustard" | "green";
export const TEAM_TONES: readonly TeamTone[] = ["pink", "cyan", "mustard", "green"];

/** One person, the agents that answer to them (COLLAB order), and the colour they all share. */
export type TeamGroup = { person: Member; agents: Member[]; tone: TeamTone };

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// The owner of an agent-id like "Claude-Pattadon": another member whose title (or, failing that, name) is the text after a
// dash. Dashes are tried left to right, so "Claude-Mary-Jane" finds "Mary-Jane" and "Claude-Opus-Pattadon" finds "Pattadon".
function ownerOf(m: Member, all: Member[]): Member | undefined {
  const title = m.title.trim();
  for (let i = title.indexOf("-"); i > 0 && i < title.length - 1; i = title.indexOf("-", i + 1)) {
    const owner = title.slice(i + 1);
    const hit = all.find((o) => o !== m && same(o.title, owner)) ?? all.find((o) => o !== m && o.name && same(o.name, owner));
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Groups members by person. A member is an agent when its title is "<Agent>-<Owner>" and the owner is another member
 * (matched on title or name, ignoring case); it goes under that person. Everyone else is a person, including an agent
 * whose owner isn't listed. Order follows COLLAB.md; the tone is one per person (cycling), shared by their agents.
 */
export function groupTeam(members: Member[]): TeamGroup[] {
  const owners = new Map<Member, Member>();
  for (const m of members) {
    const o = ownerOf(m, members);
    if (o) owners.set(m, o);
  }
  // An owner that is itself an agent (a chain or a loop) doesn't count, so nobody drops out of the list.
  const isAgent = (m: Member) => {
    const o = owners.get(m);
    return !!o && !owners.has(o);
  };
  const groups: TeamGroup[] = members.filter((m) => !isAgent(m)).map((person, i) => ({ person, agents: [], tone: TEAM_TONES[i % TEAM_TONES.length] }));
  const byPerson = new Map(groups.map((g) => [g.person, g]));
  for (const m of members) if (isAgent(m)) byPerson.get(owners.get(m)!)?.agents.push(m);
  return groups;
}

/**
 * Short name for an agent, e.g. "Claude · Pattadon's agent" for the title "Claude-Pattadon" (the title itself if it has no
 * dash). Pass the owner it was filed under so the label uses the dash that matched ("Claude-Opus-Pattadon" reads
 * "Claude-Opus · Pattadon's agent", not "Claude · Opus-Pattadon's agent").
 */
export function agentLabel(m: Member, owner?: Member): string {
  const title = m.title.trim();
  if (owner) {
    for (let i = title.indexOf("-"); i > 0 && i < title.length - 1; i = title.indexOf("-", i + 1)) {
      const text = title.slice(i + 1);
      if (same(owner.title, text) || (owner.name && same(owner.name, text))) return `${title.slice(0, i)} · ${owner.title.trim()}'s agent`;
    }
  }
  const i = title.indexOf("-");
  if (i <= 0 || i === title.length - 1) return title || m.name;
  return `${title.slice(0, i)} · ${title.slice(i + 1)}'s agent`;
}
