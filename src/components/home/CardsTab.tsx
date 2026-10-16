"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { CommitDate } from "@/lib/heatmap";
import { Icon } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { HOME_LAYOUT_KEY, moveCard, resolveLayout, toggleCard, visibleCards, type HomeLayout } from "@/lib/home";
import { signInHref } from "@/lib/github-client";
import { navItems } from "@/lib/sections";
import type { Board, TaskStatus } from "@/lib/tasks";
import { commitsOnDay, dayKey } from "@/lib/heatmap";
import { problem, useBoard, useCommits, type Load } from "./data";

const TONES = ["pink", "cyan", "mustard", "green"] as const;
const WORK = "work";
const BOARD = "board";
// Card ids: the screens' paths, then the two data cards.
// Cards for the screens, in the Figma order (Repository, Messages, Agent Context, Drive).
const SCREENS = ["/repo", "/chat", "/context", "/files"].map((href) => navItems.find((n) => n.href === href)!);
// Figma order: three screen cards, Work done + Team board, then Drive.
const ALL = [...SCREENS.slice(0, 3).map((s) => s.href), WORK, BOARD, SCREENS[3].href];
const TITLES: Record<string, string> = { [WORK]: "Work done", [BOARD]: "Team board", ...Object.fromEntries(SCREENS.map((s) => [s.href, s.title])) };

const COLUMNS: { status: TaskStatus; title: string; tone: "pink" | "mustard" | "green" }[] = [
  { status: "pending", title: "Pending", tone: "pink" },
  { status: "taken", title: "Doing", tone: "mustard" },
  { status: "done", title: "Done", tone: "green" },
];

// The Cards tab: a card for each screen, the number of finished tasks and a small team board. "Customize" lets each
// person hide or reorder the cards; it is kept in this browser (PLAN/2026-10-16-figma-ui.md).
export function CardsTab({ repo, customizing }: { repo: string | null; customizing: boolean }) {
  const board = useBoard(repo);
  const commits = useCommits(repo);
  const [layout, setLayout] = useState<HomeLayout>(() => resolveLayout(ALL, null));

  useEffect(() => {
    try {
      setLayout(resolveLayout(ALL, JSON.parse(localStorage.getItem(HOME_LAYOUT_KEY) ?? "null")));
    } catch {
      // Storage blocked or damaged: the default layout is fine.
    }
  }, []);

  const update = (next: HomeLayout) => {
    setLayout(next);
    try {
      localStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify(next));
    } catch {}
  };

  const shown = customizing ? layout.order : visibleCards(layout);
  const tone = (id: string) => TONES[Math.max(0, SCREENS.findIndex((s) => s.href === id)) % TONES.length];

  return (
    <div>
      {customizing && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <p>Move cards with the arrows. Use the eye to hide or show one. This is saved on this device.</p>
          <button type="button" onClick={() => update(resolveLayout(ALL, null))} className="glass rounded-full px-4 py-2 text-white hover:bg-white/10">
            Reset
          </button>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((id, i) => {
          const hidden = layout.hidden.includes(id);
          const section = SCREENS.find((s) => s.href === id);
          const body = section ? (
            <GoTo section={section} tone={tone(id)} link={!customizing} />
          ) : id === WORK ? (
            <WorkDone board={board} commits={commits} />
          ) : (
            <TeamBoard board={board} link={!customizing} />
          );
          const stagger = { "--d": `${i * 70}ms` } as React.CSSProperties;
          if (!customizing) return <div key={id} style={stagger} className={`rise ${id === BOARD ? "sm:col-span-2" : ""}`}>{body}</div>;
          return (
            <div key={id} className={`relative ${id === BOARD ? "sm:col-span-2" : ""}`}>
              <div className={`rounded-lg outline-2 outline-offset-2 ${hidden ? "opacity-35 outline-dashed outline-white/70" : "outline-dashed outline-white/50"}`}>{body}</div>
              <div className="absolute -top-3 right-3 flex items-center gap-1 rounded-full bg-black px-1.5 py-1 text-white" role="group" aria-label={`Arrange ${TITLES[id]}`}>
                <button type="button" onClick={() => update(moveCard(layout, id, -1))} disabled={i === 0} aria-label={`Move ${TITLES[id]} earlier`} className="grid size-7 place-items-center rounded-full hover:bg-white/20 disabled:opacity-30">
                  <span aria-hidden>↑</span>
                </button>
                <button type="button" onClick={() => update(moveCard(layout, id, 1))} disabled={i === shown.length - 1} aria-label={`Move ${TITLES[id]} later`} className="grid size-7 place-items-center rounded-full hover:bg-white/20 disabled:opacity-30">
                  <span aria-hidden>↓</span>
                </button>
                <button type="button" onClick={() => update(toggleCard(layout, id))} aria-pressed={hidden} aria-label={`${hidden ? "Show" : "Hide"} ${TITLES[id]}`} className="grid size-7 place-items-center rounded-full text-xs font-semibold hover:bg-white/20">
                  {hidden ? "Show" : "Hide"}
                </button>
              </div>
              {hidden && <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-medium">Hidden</p>}
            </div>
          );
        })}
      </div>
      {!customizing && shown.length === 0 && <p className="text-sm text-muted">All cards are hidden. Choose Customize to show some again.</p>}
    </div>
  );
}

function GoTo({ section, tone, link }: { section: (typeof SCREENS)[number]; tone: (typeof TONES)[number]; link: boolean }) {
  const body = (
    <>
      <span className="grid size-14 shrink-0 place-items-center rounded-full border border-black bg-paper">
        <Icon name={section.icon} className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{section.title}</span>
        <span className="block text-xs leading-4">{section.blurb}</span>
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-white">
        <Icon name="arrow" className="size-4" />
      </span>
    </>
  );
  const look = `block-${tone} lift flex min-h-[8.5rem] items-center gap-4 p-5`;
  return link ? (
    <Link href={section.href} className={`${look} hover:opacity-95`}>
      {body}
    </Link>
  ) : (
    <div className={look}>{body}</div>
  );
}

// "Work done": tasks closed on the board, with a bar for each of the last 7 days (commits that day, real data).
function WorkDone({ board, commits }: { board: Load<Board>; commits: Load<CommitDate[]> }) {
  const tasks = board.status === "ready" ? board.data.tasks : null;
  const done = tasks?.filter((t) => t.status === "done").length ?? null;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: dayKey(d), label: d.toLocaleDateString("en", { weekday: "short" }) };
  });
  const counts = commits.status === "ready" ? days.map((d) => commitsOnDay(commits.data, d.key)) : null;
  const max = Math.max(1, ...(counts ?? [0]));
  return (
    <Card tone="cyan" className="flex h-full min-h-[8.5rem] flex-col xl:min-h-[21rem]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Work done</h2>
        <span className="text-xs">Last 7 days</span>
      </div>
      <p className="text-[56px] font-semibold leading-none">{done ?? <span className="shimmer">00</span>}</p>
      <p className="mt-2 text-sm">{tasks ? `tasks closed, of ${tasks.length}` : (problem(board) ?? "Loading…")}</p>
      <div className="mt-auto flex h-28 items-end gap-2 pt-4" role="img" aria-label={counts ? `Commits per day: ${days.map((d, i) => `${d.label} ${counts[i]}`).join(", ")}` : "Commits per day"}>
        {days.map((d, i) => (
          <div
            key={d.key}
            title={counts ? `${counts[i]} ${counts[i] === 1 ? "commit" : "commits"} on ${d.label}` : d.label}
            className={`grow flex-1 rounded-t-lg ${i === 6 ? "bg-paper" : "bg-black"}`}
            style={{ height: `${counts ? Math.max(8, (counts[i] / max) * 100) : 8}%`, "--d": `${i * 60}ms` } as React.CSSProperties}
          />
        ))}
      </div>
      <p className="mt-2 text-xs">commits per day</p>
    </Card>
  );
}

function TeamBoard({ board, link }: { board: Load<Board>; link: boolean }) {
  const trouble = problem(board);
  return (
    <Card className="h-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Team board</h2>
        {link && (
          <Link href="/tasks" aria-label="Open the task board" className="grid size-9 place-items-center rounded-full bg-black text-white">
            <Icon name="arrow" className="size-4" />
          </Link>
        )}
      </div>
      {trouble && (
        <p className="text-sm">
          {trouble}{" "}
          {board.status === "login" && (
            <Link href={signInHref("/home")} className="font-medium underline">
              Log in
            </Link>
          )}
        </p>
      )}
      {!trouble && board.status === "loading" && <p className="text-sm">Loading…</p>}
      {board.status === "ready" && (
        <div className="grid gap-3 sm:grid-cols-3">
          {COLUMNS.map((col) => {
            const tasks = board.data.tasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className={`block-${col.tone} p-3`}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  {col.title} <Pill>{tasks.length}</Pill>
                </h3>
                <ul className="space-y-2">
                  {tasks.slice(0, 4).map((t) => {
                    const who = t.owner || (t.to && t.to !== "anyone" ? t.to : "");
                    return (
                      <li key={t.path} className="flex items-center justify-between gap-2 rounded-lg border border-black bg-paper px-2.5 py-2 text-sm leading-4">
                        <span className="min-w-0 break-words">{t.title}</span>
                        {who && <Avatar name={who} className="size-6 text-[10px]" />}
                      </li>
                    );
                  })}
                  {tasks.length === 0 && <li className="text-xs">Nothing here.</li>}
                  {tasks.length > 4 && <li className="text-xs">+{tasks.length - 4} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
