"use client";

import { Icon } from "@/components/icons";

export type Step = { title: string; sub: string };

// The four steps of the Repository page: Pick a file → Change it → Save to a branch → Ask the team. Steps before `current`
// are done (green check), the current one is the paper pill, later ones are dashed. Each step is a button that takes you
// to where that step happens. From md up a row of pills; on a phone four bars and the current step in words.
export function StepRail({ steps, current, onPick }: { steps: Step[]; current: number; onPick: (step: number) => void }) {
  const state = (n: number) => (n < current ? "done" : n === current ? "current" : "next");
  const now = steps[Math.min(current, steps.length) - 1];
  return (
    <nav aria-label="Steps" className="mb-5">
      <ol className="hidden grid-cols-4 gap-3 md:grid">
        {steps.map((s, i) => {
          const n = i + 1;
          const st = state(n);
          return (
            <li key={s.title} className="min-w-0">
              <button
                type="button"
                onClick={() => onPick(n)}
                aria-current={st === "current" ? "step" : undefined}
                className={`flex h-[3.25rem] w-full min-w-0 items-center gap-2.5 rounded-full pl-3 pr-4 text-left ${
                  st === "current"
                    ? "border-[1.5px] border-black bg-paper text-black shadow-[0_8px_18px_-10px_rgba(0,0,0,0.8)]"
                    : st === "done"
                      ? "border border-white/25 text-white hover:bg-white/5"
                      : "border border-dashed border-white/20 text-white/75 hover:bg-white/5"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    st === "done" ? "bg-green text-black" : st === "current" ? "bg-black text-white" : "border border-white/40"
                  }`}
                >
                  {st === "done" ? <Icon name="check" className="size-3.5" /> : n}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    <span className="sr-only">{`Step ${n}${st === "done" ? ", done" : ""}: `}</span>
                    {s.title}
                  </span>
                  <span className={`block truncate text-xs ${st === "current" ? "text-black/65" : st === "done" ? "text-white/60" : "text-white/50"}`}>{s.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="md:hidden">
        <ol className="flex gap-1.5" aria-label="Progress">
          {steps.map((s, i) => {
            const st = state(i + 1);
            return (
              <li key={s.title} className="flex-1">
                <button
                  type="button"
                  onClick={() => onPick(i + 1)}
                  aria-label={`Step ${i + 1}: ${s.title}${st === "done" ? ", done" : st === "current" ? ", current" : ""}`}
                  className="block w-full py-2"
                >
                  <span className={`block h-1.5 rounded-full ${st === "done" ? "bg-green" : st === "current" ? "bg-paper" : "bg-white/20"}`} />
                </button>
              </li>
            );
          })}
        </ol>
        {now && current <= steps.length ? (
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium">{`Step ${current} of ${steps.length} · ${now.title}`}</span>
            <span className="text-xs text-white/55">{now.sub}</span>
          </p>
        ) : (
          <p className="text-sm font-medium">All four steps done: the team can review your pull request.</p>
        )}
      </div>
    </nav>
  );
}
