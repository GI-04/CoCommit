"use client";

// Commit activity grid for the picked repo (PLAN/2026-10-16-heat-map.md): one square per day, darker = more commits.
import { useEffect, useMemo, useState } from "react";
import { getCurrentRepo } from "@/lib/current-repo";
import { GitHubRequestError, listCommitDates, signInHref } from "@/lib/github-client";
import { buildHeatMap, dayKey, windowStart, type CommitDate, type HeatCell } from "@/lib/heatmap";
import { Card } from "./ui";

const WEEKS = 13;
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVEL_PERCENT = [0, 25, 45, 70, 100];

const shade = (level: HeatCell["level"]) =>
  level === 0 ? "var(--border)" : `color-mix(in srgb, var(--accent) ${LEVEL_PERCENT[level]}%, transparent)`;

const describe = (c: HeatCell) =>
  `${c.count} ${c.count === 1 ? "commit" : "commits"} on ${new Date(`${c.date}T12:00:00`).toDateString()}`;

export function HeatMap() {
  const [repo, setRepo] = useState<string | null>(null);
  const [commits, setCommits] = useState<CommitDate[] | null>(null);
  const [error, setError] = useState<{ text: string; href?: string } | null>(null);
  const [who, setWho] = useState("");
  const [picked, setPicked] = useState<HeatCell | null>(null);

  useEffect(() => setRepo(getCurrentRepo()), []);

  useEffect(() => {
    if (!repo) return;
    let live = true;
    setCommits(null);
    setError(null);
    setWho("");
    setPicked(null);
    listCommitDates(repo, windowStart(WEEKS, new Date()).toISOString())
      .then((list) => live && setCommits(list))
      .catch((e) => {
        if (!live) return;
        if (e instanceof GitHubRequestError && e.status === 401) setError({ text: "Log in with GitHub to see commit activity.", href: signInHref("/home") });
        else setError({ text: e instanceof Error ? e.message : "Couldn't load commit activity." });
      });
    return () => {
      live = false;
    };
  }, [repo]);

  const map = useMemo(() => (commits ? buildHeatMap(commits, WEEKS, new Date(), who || undefined) : null), [commits, who]);
  const today = dayKey(new Date());
  // A month label above the first week that starts in that month.
  const monthAt = (week: (HeatCell | null)[], i: number) => {
    const first = week[0];
    if (!first) return "";
    const month = Number(first.date.slice(5, 7)) - 1;
    const before = i > 0 ? map?.weeks[i - 1][0] : null;
    return !before || Number(before.date.slice(5, 7)) - 1 !== month ? MONTHS[month] : "";
  };

  return (
    <Card title={`Commit activity${repo ? ` · ${repo}` : ""}`} className="mt-8">
      {error && (
        <p className="text-sm text-muted">
          {error.text}{" "}
          {error.href && (
            <a href={error.href} className="text-accent underline">
              Log in
            </a>
          )}
        </p>
      )}
      {!error && !map && <p className="text-sm text-muted">Loading…</p>}
      {map && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">
              {map.total} {map.total === 1 ? "commit" : "commits"} in the last {WEEKS} weeks
            </span>
            {map.authors.length > 0 && (
              <label className="flex items-center gap-2 text-muted">
                Person
                <select
                  value={who}
                  onChange={(e) => setWho(e.target.value)}
                  className="rounded-md border border-line bg-surface px-2 py-1 text-fg"
                >
                  <option value="">Everyone</option>
                  {map.authors.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="inline-flex gap-1" role="img" aria-label={`Commit activity, ${map.total} commits in the last ${WEEKS} weeks`}>
              <div className="flex flex-col gap-1 pt-4 pr-1 text-[10px] leading-3 text-muted">
                {DAYS.map((d, i) => (
                  <span key={i} className="h-3">
                    {d}
                  </span>
                ))}
              </div>
              {map.weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="h-3 text-[10px] leading-3 text-muted">{monthAt(week, i)}</span>
                  {week.map((cell, d) =>
                    cell ? (
                      <button
                        key={d}
                        type="button"
                        title={describe(cell)}
                        aria-label={describe(cell)}
                        onClick={() => setPicked(cell)}
                        className={`h-3 w-3 rounded-sm ${cell.date === today ? "outline outline-1 outline-fg/50" : ""}`}
                        style={{ background: shade(cell.level) }}
                      />
                    ) : (
                      <span key={d} className="h-3 w-3" />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span aria-live="polite">{picked ? describe(picked) : map.total === 0 ? "No commits in this window yet." : "Tap a square for details."}</span>
            <span className="flex items-center gap-1">
              Less
              {([0, 1, 2, 3, 4] as const).map((l) => (
                <span key={l} className="h-3 w-3 rounded-sm" style={{ background: shade(l) }} />
              ))}
              More
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
