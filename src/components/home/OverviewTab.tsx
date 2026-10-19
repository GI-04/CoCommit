"use client";

import { HeatMap } from "@/components/HeatMap";
import { TeamSpines } from "@/components/TeamSpines";
import { Card, Skeleton } from "@/components/ui";
import { buildHeatMap } from "@/lib/heatmap";
import { problem, useBoard, useCommits, WEEKS, type Load } from "./data";
import { DemoTag, DemoTitle, Trouble } from "./Trouble";

// The Overview tab: three numbers, the commit activity grid and who is on the team. Everything is read from the
// repo; a number that can't be read shows a dash and the reason. Signed out it shows the demo team, tagged "Demo".
export function OverviewTab({ repo }: { repo: string | null }) {
  const commits = useCommits(repo, true);
  const board = useBoard(repo, true);

  const tasks = board.status === "ready" ? board.data.tasks : null;
  const total = commits.status === "ready" ? buildHeatMap(commits.data, WEEKS, new Date()).total : null;
  const reason = (state: typeof commits | typeof board) => problem(state) ?? "Loading…";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat tone="pink" label="Commits" state={commits} value={total} sub={total === null ? reason(commits) : `in the last ${WEEKS} weeks`} />
        <Stat tone="mustard" label="Tasks done" state={board} value={tasks ? tasks.filter((t) => t.status === "done").length : null} sub={tasks ? `of ${tasks.length} tasks` : reason(board)} />
        <Stat tone="cyan" label="Open tasks" state={board} value={tasks ? tasks.filter((t) => t.status !== "done").length : null} sub={tasks ? `${tasks.filter((t) => t.status === "taken").length} in progress` : reason(board)} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <HeatMap repo={repo} state={commits} />
        <Card title={<DemoTitle text="Team" state={board} />}>
          {board.status === "ready" ? (
            board.data.members.length ? (
              <TeamSpines members={board.data.members} />
            ) : (
              <p className="text-sm">Nobody is listed in COLLAB.md yet.</p>
            )
          ) : (
            board.status === "loading" ? <Skeleton lines={4} /> : <Trouble state={board} from="/home" />
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ tone, label, state, value, sub }: { tone: "pink" | "mustard" | "cyan"; label: string; state: Load<unknown>; value: number | null; sub: string }) {
  // On a phone the number sits on the right of a short row (Figma "Mobile · Home · Overview"); wider screens stack it.
  return (
    <section className={`block-${tone} p-5 max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:items-center max-sm:gap-x-4`}>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {label} <DemoTag state={state} />
      </h2>
      <p className="text-[56px] font-semibold leading-none max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1 sm:mt-3">{value ?? "–"}</p>
      <p className="mt-1 text-sm max-sm:col-start-1 sm:mt-2">{sub}</p>
    </section>
  );
}
