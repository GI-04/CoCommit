"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { CommitDate } from "@/lib/heatmap";
import { Icon } from "@/components/icons";
import { Card, Pill, Skeleton } from "@/components/ui";
import { HOME_LAYOUT_KEY, moveCard, moveCardTo, resolveLayout, toggleCard, visibleCards, type HomeLayout } from "@/lib/home";
import { signInHref } from "@/lib/github-client";
import { chatSummary, commitSummary, contextSummary, driveSummary } from "@/lib/home-summary";
import { navItems } from "@/lib/sections";
import type { Board, TaskStatus } from "@/lib/tasks";
import { commitsOnDay, dayKey } from "@/lib/heatmap";
import { problem, useBoard, useCommits, useDriveFiles, useLatestCommit, useNextStep, useRecentChat, type Load } from "./data";
import { Trouble } from "./Trouble";
import { useCardDrag } from "./useCardDrag";

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
// person hide or reorder the cards; it is kept in this browser (PLAN/2026-10-16-figma-ui.md). Each screen card also shows
// a few lines of real data (PLAN/2026-10-16-glass-buttons-spines.md): they load by themselves, and a card whose data can't
// load keeps just its blurb.
export function CardsTab({ repo, customizing }: { repo: string | null; customizing: boolean }) {
  const board = useBoard(repo);
  const commits = useCommits(repo);
  const [layout, setLayout] = useState<HomeLayout>(() => resolveLayout(ALL, null));
  // Nothing is read while arranging cards, or for a card that is hidden; what was loaded before stays.
  // The saved layout is read in an effect, so wait for it: a hidden card must not start a read on the first render.
  const [layoutReady, setLayoutReady] = useState(false);
  const reads = (id: string) => layoutReady && !customizing && !layout.hidden.includes(id);
  const latest = useLatestCommit(repo, reads("/repo"));
  const chat = useRecentChat(repo, reads("/chat"));
  const next = useNextStep(repo, reads("/context"));
  const files = useDriveFiles(repo, reads("/files"));
  const summaries: Record<string, string[]> = {
    "/repo": latest.status === "ready" && latest.data ? commitSummary(latest.data) : [],
    "/chat": chat.status === "ready" ? chatSummary(chat.data) : [],
    "/context": next.status === "ready" ? contextSummary(next.data) : [],
    "/files": files.status === "ready" ? driveSummary(files.data) : [],
  };

  useEffect(() => {
    try {
      setLayout(resolveLayout(ALL, JSON.parse(localStorage.getItem(HOME_LAYOUT_KEY) ?? "null")));
    } catch {
      // Storage blocked or damaged: the default layout is fine.
    }
    setLayoutReady(true);
  }, []);

  const update = (next: HomeLayout) => {
    setLayout(next);
    try {
      localStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify(next));
    } catch {}
  };

  // Moving a card (by the arrows or by dropping it) is also said out loud for screen readers.
  const [said, setSaid] = useState("");
  const say = (text: string) => setSaid((old) => (old.replace("\u200b", "") === text && !old.endsWith("\u200b") ? `${text}\u200b` : text)); // a repeated sentence is announced again
  const move = (next: HomeLayout, id: string) => {
    if (next === layout) return;
    update(next);
    say(`Moved ${TITLES[id]} to place ${next.order.indexOf(id) + 1} of ${next.order.length}.`);
  };
  const dnd = useCardDrag({ enabled: customizing, onDrop: (id, overId) => move(moveCardTo(layout, id, layout.order.indexOf(overId)), id) });

  const shown = customizing ? layout.order : visibleCards(layout);
  const tone = (id: string) => TONES[Math.max(0, SCREENS.findIndex((s) => s.href === id)) % TONES.length];

  return (
    <div>
      {customizing && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <p>Drag a card by its dots, or use its arrows, to move it. Use Hide or Show to hide or show one. This is saved on this device.</p>
          <button type="button" onClick={() => {
              update(resolveLayout(ALL, null));
              say("Cards put back in the default order.");
            }}
            className="glass rounded-full px-4 py-2 text-white hover:bg-white/10">
            Reset
          </button>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((id, i) => {
          const hidden = layout.hidden.includes(id);
          const section = SCREENS.find((s) => s.href === id);
          const body = section ? (
            <GoTo section={section} tone={tone(id)} link={!customizing} lines={summaries[id] ?? []} />
          ) : id === WORK ? (
            <WorkDone board={board} commits={commits} />
          ) : (
            <TeamBoard board={board} link={!customizing} />
          );
          const stagger = { "--d": `${i * 70}ms` } as React.CSSProperties;
          if (!customizing) return <div key={id} style={stagger} className={`rise min-w-0 ${id === BOARD ? "sm:col-span-2" : ""}`}>{body}</div>;
          const dragged = dnd.drag?.id === id;
          const target = !!dnd.drag && dnd.drag.over === id;
          return (
            <div
              key={id}
              ref={dnd.ref(id)}
              {...dnd.bind(id)}
              style={dragged ? { transform: `translate3d(${dnd.drag!.dx}px, ${dnd.drag!.dy}px, 0) scale(1.03)`, transition: "none" } : undefined}
              className={`relative min-w-0 select-none ${id === BOARD ? "sm:col-span-2" : ""} ${dragged ? "z-[45] cursor-grabbing drop-shadow-2xl" : dnd.drag ? "" : "cursor-grab"}`}
            >
              <div
                className={`rounded-lg outline-2 outline-offset-2 ${dragged ? "opacity-90" : hidden ? (target ? "opacity-60" : "opacity-35") : ""} ${
                  target ? "outline-4 outline-solid outline-white" : hidden ? "outline-dashed outline-white/70" : "outline-dashed outline-white/50"
                }`}
              >
                {body}
              </div>
              <div className="absolute -top-3 right-3 flex items-center gap-1 rounded-full bg-black px-1.5 py-1 text-white" role="group" aria-label={`Arrange ${TITLES[id]}`}>
                <span data-drag-handle aria-hidden title="Drag to move" className={`grid size-7 touch-none place-items-center rounded-full text-white/80 hover:bg-white/20 [@media(pointer:coarse)]:size-9 ${dragged ? "cursor-grabbing" : "cursor-grab"}`}>
                  <svg viewBox="0 0 12 12" className="size-3.5" fill="currentColor">
                    {[2, 6, 10].flatMap((y) => [4, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" />))}
                  </svg>
                </span>
                <button type="button" onClick={() => move(moveCard(layout, id, -1), id)} disabled={i === 0} aria-label={`Move ${TITLES[id]} earlier`} className="grid size-7 place-items-center rounded-full hover:bg-white/20 disabled:opacity-30">
                  <span aria-hidden>↑</span>
                </button>
                <button type="button" onClick={() => move(moveCard(layout, id, 1), id)} disabled={i === shown.length - 1} aria-label={`Move ${TITLES[id]} later`} className="grid size-7 place-items-center rounded-full hover:bg-white/20 disabled:opacity-30">
                  <span aria-hidden>↓</span>
                </button>
                <button type="button" onClick={() => {
                    update(toggleCard(layout, id));
                    say(`${TITLES[id]} ${hidden ? "shown" : "hidden"}.`);
                  }}
                  aria-pressed={hidden} aria-label={`${hidden ? "Show" : "Hide"} ${TITLES[id]}`} className="grid size-7 place-items-center rounded-full text-xs font-semibold hover:bg-white/20">
                  {hidden ? "Show" : "Hide"}
                </button>
              </div>
              {hidden && <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-medium">Hidden</p>}
            </div>
          );
        })}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {said}
      </p>
      {!customizing && shown.length === 0 && <p className="text-sm text-muted">All cards are hidden. Choose Customize to show some again.</p>}
    </div>
  );
}

function GoTo({ section, tone, link, lines }: { section: (typeof SCREENS)[number]; tone: (typeof TONES)[number]; link: boolean; lines: string[] }) {
  const body = (
    <>
      <span className="grid size-14 shrink-0 place-items-center rounded-full border border-black bg-paper">
        <Icon name={section.icon} className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{section.title}</span>
        <span className="block text-xs leading-4">{section.blurb}</span>
        {lines.length > 0 && (
          <span className="mt-2 block space-y-0.5 border-t border-black/30 pt-2">
            {lines.map((line, i) => (
              <span key={i} title={line} className="block truncate text-xs font-medium leading-4">
                {line}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-white">
        <Icon name="arrow" className="size-4" />
      </span>
    </>
  );
  const look = `block-${tone} lift flex h-full min-h-[8.5rem] items-center gap-4 p-5`;
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
      <p className="mt-2 text-xs">commits per day, last 7 days</p>
    </Card>
  );
}

function TeamBoard({ board, link }: { board: Load<Board>; link: boolean }) {
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
      <Trouble state={board} from="/home" />
      {board.status === "loading" && <Skeleton lines={4} />}
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
