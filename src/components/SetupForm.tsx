"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { getSession, GitHubRequestError, signInHref } from "@/lib/github-client";
import { dayKey } from "@/lib/heatmap";
import { setUpWorkspace } from "@/lib/workspace";

const field = "w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm";

// "Set up team context": adds the COCOMMIT/ folder to the repo (one commit, through the existing setUpWorkspace) so
// Agent Context, Tasks and the Assistant have something to read. You become the first team member.
export function SetupForm({ repo, onDone }: { repo: string; onDone: () => void }) {
  const [project, setProject] = useState(repo.split("/")[1] ?? repo);
  const [what, setWhat] = useState("");
  const [goals, setGoals] = useState("");
  const [stack, setStack] = useState("");
  const [firstStep, setFirstStep] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; login?: boolean } | null>(null);

  // Why the button is off, in words.
  const missing = !project.trim() ? "Add a project name." : !what.trim() ? "Say in a sentence what the project is." : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || missing) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = await getSession();
      if (!user) throw new GitHubRequestError(401, "Log in with GitHub to set this up.");
      await setUpWorkspace(repo, {
        project: project.trim(),
        what: what.trim(),
        goals: goals.trim() || undefined,
        stack: stack.trim() || undefined,
        firstStep: firstStep.trim() || undefined,
        members: [{ title: user.login, name: user.name || user.login, role: "Team member", capability: "unknown — ask", availability: "unknown — ask", writeScope: "anything" }],
        by: user.login,
        date: dayKey(new Date()),
      });
      onDone();
    } catch (e) {
      setError(e instanceof GitHubRequestError && e.status === 401 ? { text: "Log in with GitHub to set this up.", login: true } : { text: e instanceof Error ? e.message : "Couldn't set it up. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <p className="text-sm">
        {repo} has no team context yet. This adds a <code>COCOMMIT/</code> folder to the repo (one commit) with the project summary, team, decisions, gotchas, log, to-do and task board, so your team and your AI agents start from the same notes.
      </p>
      <label className="block text-sm font-medium">
        Project name
        <input value={project} onChange={(e) => setProject(e.target.value)} className={`${field} mt-1`} />
      </label>
      <label className="block text-sm font-medium">
        What is it, in a sentence?
        <textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={2} className={`${field} mt-1`} placeholder="A study planner for first-year students" />
      </label>
      <label className="block text-sm font-medium">
        Goals <span className="font-normal">(optional)</span>
        <input value={goals} onChange={(e) => setGoals(e.target.value)} className={`${field} mt-1`} />
      </label>
      <label className="block text-sm font-medium">
        Stack <span className="font-normal">(optional)</span>
        <input value={stack} onChange={(e) => setStack(e.target.value)} className={`${field} mt-1`} placeholder="Next.js, Supabase" />
      </label>
      <label className="block text-sm font-medium">
        First step <span className="font-normal">(optional)</span>
        <input value={firstStep} onChange={(e) => setFirstStep(e.target.value)} className={`${field} mt-1`} />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-removed">
          {error.text}{" "}
          {error.login && (
            <Link href={signInHref("/context")} className="underline">
              Log in
            </Link>
          )}
        </p>
      )}
      <Button type="submit" disabled={busy || !!missing} aria-describedby={missing ? "setup-hint" : undefined} className="w-full py-3">
        {busy ? "Setting up…" : "Set up team context"}
      </Button>
      {missing && !busy && (
        <p id="setup-hint" className="text-xs">
          {missing}
        </p>
      )}
    </form>
  );
}
