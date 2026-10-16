"use client";

import { Avatar } from "@/components/Avatar";
import { Card, Pill, Skeleton } from "@/components/ui";
import { commitsOnDay, commitStreak, dayKey } from "@/lib/heatmap";
import { timeAgo } from "@/lib/home";
import { problem, useActivity, useCommits } from "./data";
import { Trouble } from "./Trouble";

const KIND = { commit: "commit", pr: "pull request", pinned: "pinned" } as const;

// The Activity tab: what happened in the repo lately (commits, merged pull requests, pinned chat) and two numbers
// worked out from the same commits: today and the streak of days in a row.
export function ActivityTab({ repo }: { repo: string | null }) {
  const activity = useActivity(repo);
  const commits = useCommits(repo);
  const now = new Date();
  const ready = commits.status === "ready" ? commits.data : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
      <Card title="Recent activity">
        <Trouble state={activity} from="/home" />
        {activity.status === "loading" && <Skeleton lines={5} />}
        {activity.status === "ready" && activity.data.length === 0 && <p className="text-sm">Nothing yet. Commit something and it shows up here.</p>}
        {activity.status === "ready" && (
          <ul className="divide-y divide-black/20">
            {activity.data.map((a, i) => (
              <li key={`${a.at}-${i}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={a.author} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm">
                    <span className="font-semibold">{a.author}</span> {a.text}
                  </p>
                  <Pill className="mt-1">{KIND[a.kind]}</Pill>
                </div>
                <time dateTime={a.at} suppressHydrationWarning className="shrink-0 text-xs text-muted">
                  {timeAgo(a.at, now)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Card tone="cyan" title="Today">
          <p className="text-[56px] font-semibold leading-none">{ready ? commitsOnDay(ready, dayKey(now)) : "–"}</p>
          <p className="mt-2 text-sm">{ready ? "commits today" : (problem(commits) ?? "Loading…")}</p>
        </Card>
        <Card tone="pink" title="Streak">
          <p className="text-[56px] font-semibold leading-none">{ready ? commitStreak(ready, now) : "–"}</p>
          <p className="mt-2 text-sm">{ready ? "days in a row with a commit" : (problem(commits) ?? "Loading…")}</p>
        </Card>
      </div>
    </div>
  );
}
