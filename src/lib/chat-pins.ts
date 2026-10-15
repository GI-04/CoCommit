// "Pin as decision / gotcha": turns a chat message into an entry in the repo's COCOMMIT/DECISIONS.md or GOTCHAS.md,
// so every teammate's AI agent reads it. Browser code ("use client" screens).
// Saving is a commit, so it needs GitHub login (401 otherwise) and a set-up workspace (COCOMMIT/CONTEXT.md).

import { pinMessage, type ChatMessage } from "./chat";
import { FILES, type Decision, type Gotcha } from "./context";
import { readFile } from "./github-client";
import type { Commit } from "./github-types";
import { addDecisionTo, addGotchaTo } from "./workspace";

export type DecisionFields = { title: string; decision: string; why: string; alternatives: string };
export type GotchaFields = { title: string; whatFailed: string; workaround: string };

/** The repo has no COCOMMIT/ workspace yet: someone has to press "Set up team context" first. */
export class NoWorkspaceError extends Error {
  constructor() {
    super("This repo has no team context yet. Set it up on the Context screen first.");
    this.name = "NoWorkspaceError";
  }
}

const source = (m: ChatMessage) => `chat, ${m.author}, ${m.createdAt.slice(0, 16).replace("T", " ")} UTC`;

/** A short title from the message: first ~60 characters on one line. */
export function suggestedTitle(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > 60 ? `${line.slice(0, 57).trimEnd()}…` : line;
}

/** Form fields prefilled from a message. */
export const decisionFields = (m: ChatMessage): DecisionFields => ({ title: suggestedTitle(m.text), decision: m.text, why: "", alternatives: "" });
export const gotchaFields = (m: ChatMessage): GotchaFields => ({ title: suggestedTitle(m.text), whatFailed: m.text, workaround: "" });

export function decisionFromMessage(m: ChatMessage, f: DecisionFields): Decision {
  const why = f.why.trim();
  return {
    date: m.createdAt.slice(0, 10),
    title: f.title.trim() || suggestedTitle(m.text),
    decision: f.decision.trim() || m.text,
    why: why ? `${why} (from ${source(m)})` : `From ${source(m)}`,
    alternatives: f.alternatives.trim() || undefined,
  };
}

export function gotchaFromMessage(m: ChatMessage, f: GotchaFields): Gotcha {
  return {
    date: m.createdAt.slice(0, 10),
    title: f.title.trim() || suggestedTitle(m.text),
    whatFailed: f.whatFailed.trim() || m.text,
    evidence: `Reported in ${source(m)}`,
    workaround: f.workaround.trim() || "Not found yet",
  };
}

async function requireWorkspace(repo: string): Promise<void> {
  if ((await readFile(repo, null, FILES.context)) === null) throw new NoWorkspaceError();
}

/** Adds the message to COCOMMIT/DECISIONS.md (one commit) and pins it. Returns null if the same entry is already there. */
export async function saveAsDecision(repo: string, m: ChatMessage, f: DecisionFields): Promise<Commit | null> {
  await requireWorkspace(repo);
  const commit = await addDecisionTo(repo, decisionFromMessage(m, f));
  if (!m.pinned) await pinMessage(m.id).catch(() => {});
  return commit;
}

/** Adds the message to COCOMMIT/GOTCHAS.md (one commit) and pins it. Returns null if the same entry is already there. */
export async function saveAsGotcha(repo: string, m: ChatMessage, f: GotchaFields): Promise<Commit | null> {
  await requireWorkspace(repo);
  const commit = await addGotchaTo(repo, gotchaFromMessage(m, f));
  if (!m.pinned) await pinMessage(m.id).catch(() => {});
  return commit;
}
