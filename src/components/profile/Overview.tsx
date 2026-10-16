"use client";

import { Avatar, Initials } from "@/components/Avatar";
import { DownloadButton } from "@/components/DownloadButton";
import { problem, useActivity, useCommits, useRepo, WEEKS } from "@/components/home/data";
import { Card, Pill } from "@/components/ui";
import { useRepos } from "@/components/useRepos";
import type { AccountProfile } from "@/lib/profile";
import type { User as GitHubUser } from "@/lib/github-types";
import { buildHeatMap } from "@/lib/heatmap";
import { timeAgo } from "@/lib/home";

const KIND_DOT = { commit: "bg-green", pr: "bg-cyan", pinned: "bg-pink" } as const;

// The Profile "Overview" tab (Figma "Profile · Overview"): who you are, your commits, your repos as teams and what
// happened lately. Everything comes from the repo you picked; nothing is made up.
export function ProfileOverview({ name, profile, github, onEdit }: { name: string; profile: AccountProfile | null | undefined; github: GitHubUser | null | undefined; onEdit: () => void }) {
  const repo = useRepo();
  const commits = useCommits(repo);
  const activity = useActivity(repo);
  const { repos } = useRepos();
  const mine = commits.status === "ready" && github ? buildHeatMap(commits.data, WEEKS, new Date(), github.login).total : null;
  const now = new Date();

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
      <div className="min-w-0 space-y-4">
        <Card tone="cyan" className="flex flex-col items-center gap-3 text-center">
          <Avatar name={name} url={profile?.avatarUrl ?? github?.avatarUrl} className="size-28 text-4xl" />
          <h2 className="break-words text-xl font-semibold">{name}</h2>
          <p className="text-sm">{profile ? "CoCommit account" : "Signed in with GitHub"}</p>
          <div className="w-full space-y-2 text-left text-sm">
            {github && (
              <p className="flex items-center justify-between gap-3 rounded-xl border border-black bg-paper px-4 py-3">
                <span className="font-medium">GitHub</span>
                <span className="truncate text-muted">@{github.login}</span>
              </p>
            )}
            {profile?.email && (
              <p className="flex items-center justify-between gap-3 rounded-xl border border-black bg-paper px-4 py-3">
                <span className="font-medium">Email</span>
                <span className="truncate text-muted">{profile.email}</span>
              </p>
            )}
          </div>
          <button type="button" onClick={onEdit} className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:opacity-90">
            Edit profile
          </button>
        </Card>
        {/* The desktop app download (hidden inside the desktop app itself). */}
        <DownloadButton />
      </div>

      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <section className="block-pink p-5">
            <p className="text-[44px] font-semibold leading-none">{mine ?? "–"}</p>
            <p className="mt-2 text-sm">{mine === null ? (github ? (problem(commits) ?? "Loading…") : "Log in with GitHub to count your commits.") : `commits by you, last ${WEEKS} weeks`}</p>
          </section>
          <section className="block-mustard p-5">
            <p className="text-[44px] font-semibold leading-none">{repos.length || "–"}</p>
            <p className="mt-2 text-sm">{repos.length ? "teams (your repos)" : "Log in with GitHub to see your repos."}</p>
          </section>
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Your teams</h2>
            <span className="text-xs text-muted">{repos.length} {repos.length === 1 ? "team" : "teams"}</span>
          </div>
          {repos.length === 0 ? (
            <p className="text-sm text-muted">Nothing to show yet.</p>
          ) : (
            <ul className="divide-y divide-black/15">
              {repos.slice(0, 6).map((r) => {
                const [owner, repoName] = r.fullName.split("/");
                return (
                  <li key={r.fullName} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Initials text={repoName ?? r.fullName} className="size-10 text-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{repoName}</span>
                      <span className="block truncate text-xs text-muted">{owner}</span>
                    </span>
                    {r.private && <Pill>Private</Pill>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Recent activity">
          {activity.status === "ready" ? (
            activity.data.length === 0 ? (
              <p className="text-sm text-muted">Nothing yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.data.slice(0, 5).map((a, i) => (
                  <li key={`${a.at}-${i}`} className="flex items-center gap-3 text-sm">
                    <span className={`size-2.5 shrink-0 rounded-full border border-black ${KIND_DOT[a.kind]}`} aria-hidden />
                    <span className="min-w-0 flex-1 break-words">
                      <span className="font-semibold">{a.author}</span> {a.text}
                    </span>
                    <time dateTime={a.at} suppressHydrationWarning className="shrink-0 text-xs text-muted">
                      {timeAgo(a.at, now)}
                    </time>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-sm text-muted">{problem(activity) ?? "Loading…"}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
