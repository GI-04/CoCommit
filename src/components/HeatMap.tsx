"use client";

// Commit activity grid for the picked repo (PLAN/2026-10-16-heat-map.md): one square per day, darker = more commits.
// Figma look: a pink card with a black opacity ramp. The commits come from the Home screen, so the Overview tab can
// reuse the same load for its numbers.
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { problem, WEEKS, type Load } from "@/components/home/data";
import { signInHref } from "@/lib/github-client";
import { buildHeatMap, dayKey, type CommitDate, type HeatCell } from "@/lib/heatmap";
import { Card } from "./ui";

const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RAMP = [0.1, 0.28, 0.5, 0.75, 1];

const shade = (level: HeatCell["level"]) => `rgba(0, 0, 0, ${RAMP[level]})`;

const describe = (c: HeatCell) =>
  `${c.count} ${c.count === 1 ? "commit" : "commits"} on ${new Date(`${c.date}T12:00:00`).toDateString()}`;

export function HeatMap({ repo, state }: { repo: string | null; state: Load<CommitDate[]> }) {
  const [who, setWho] = useState("");
  const [picked, setPicked] = useState<HeatCell | null>(null);

  const commits = state.status === "ready" ? state.data : null;
  const map = useMemo(() => (commits ? buildHeatMap(commits, WEEKS, new Date(), who || undefined) : null), [commits, who]);
  const today = dayKey(new Date());
  const trouble = problem(state);

  // A month label above the first week that starts in that month.
  const monthAt = (week: (HeatCell | null)[], i: number) => {
    const first = week[0];
    if (!first) return "";
    const month = Number(first.date.slice(5, 7)) - 1;
    const before = i > 0 ? map?.weeks[i - 1][0] : null;
    return !before || Number(before.date.slice(5, 7)) - 1 !== month ? MONTHS[month] : "";
  };

  return (
    <Card tone="pink" title={`Commit activity${repo ? ` · ${repo}` : ""}`}>
      {trouble && (
        <p className="text-sm">
          {trouble}{" "}
          {state.status === "login" && (
            <Link href={signInHref("/home")} className="font-medium underline">
              Log in
            </Link>
          )}
        </p>
      )}
      {!trouble && !map && <p className="text-sm">Loading…</p>}
      {map && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {map.total} {map.total === 1 ? "commit" : "commits"} in the last {WEEKS} weeks
            </span>
            {map.authors.length > 0 && (
              <label className="flex items-center gap-2">
                Person
                <select value={who} onChange={(e) => setWho(e.target.value)} className="rounded-full border border-black bg-paper px-3 py-1 text-black">
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
          <div
            className="grid grid-cols-[2rem_repeat(13,minmax(0,1fr))] gap-1 text-[11px] sm:gap-1.5"
            role="img"
            aria-label={`Commit activity, ${map.total} commits in the last ${WEEKS} weeks`}
          >
            <span />
            {map.weeks.map((week, i) => (
              <span key={i} className="h-4 whitespace-nowrap leading-4">
                {monthAt(week, i)}
              </span>
            ))}
            {DAYS.map((label, d) => (
              <Fragment key={d}>
                <span className="self-center">{label}</span>
                {map.weeks.map((week, i) => {
                  const cell = week[d];
                  return cell ? (
                    <button
                      key={i}
                      type="button"
                      title={describe(cell)}
                      aria-label={describe(cell)}
                      onClick={() => setPicked(cell)}
                      className={`h-5 w-full rounded-md sm:h-7 ${cell.date === today ? "outline outline-2 outline-offset-1 outline-black" : ""}`}
                      style={{ background: shade(cell.level) }}
                    />
                  ) : (
                    <span key={i} />
                  );
                })}
              </Fragment>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span aria-live="polite">{picked ? describe(picked) : map.total === 0 ? "No commits in this window yet." : "Tap a square for details."}</span>
            <span className="flex items-center gap-1">
              Less
              {([0, 1, 2, 3, 4] as const).map((l) => (
                <span key={l} className="h-3.5 w-3.5 rounded-sm" style={{ background: shade(l) }} />
              ))}
              More
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
