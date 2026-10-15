"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { HOME_LAYOUT_KEY, moveCard, resolveLayout, toggleCard, visibleCards, type HomeLayout } from "@/lib/home";
import { signInHref } from "@/lib/github-client";
import { navItems } from "@/lib/sections";
import type { Board, TaskStatus } from "@/lib/tasks";
import { problem, useBoard, type Load } from "./data";

const TONES = ["pink", "cyan", "mustard", "green"] as const;
const WORK = "work";
const BOARD = "board";
// Card ids: the screens' paths, then the two data cards.
// Cards for the screens, in the Figma order (Repository, Messages, Agent Context, Drive).
const SCREENS = ["/repo", "/chat", "/context", "/files"].map((href) => navItems.find((n) => n.href === href)!);
const ALL = [...SCREENS.map((s) => s.href), WORK, BOARD];
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((id, i) => {
          const hidden = layout.hidden.includes(id);
          const section = SCREENS.find((s) => s.href === id);
          const body = section ? (
            <GoTo section={section} tone={tone(id)} link={!customizing} />
          ) : id === WORK ? (
            <WorkDone board={board} />
          ) : (
            <TeamBoard board={board} link={!customizing} />
          );
          if (!customizing) return <div key={id} className={id === BOARD ? "sm:col-span-2" : ""}>{body}</div>;
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
  const look = `block-${tone} flex min-h-[8.5rem] items-center gap-4 p-5`;
  return link ? (
    <Link href={section.href} className={`${look} hover:opacity-95`}>
      {body}
    </Link>
  ) : (
    <div className={look}>{body}</div>
  );
}

function WorkDone({ board }: { board: Load<Board> }) {
  const tasks = board.status === "ready" ? board.data.tasks : null;
  const done = tasks?.filter((t) => t.status === "done").length ?? null;
  return (
    <Card tone="cyan" className="min-h-[8.5rem]" title="Work done">
      <p className="text-[56px] font-semibold leading-none">{done ?? "–"}</p>
      <p className="mt-2 text-sm">{tasks ? `tasks closed, of ${tasks.length}` : (problem(board) ?? "Loading…")}</p>
    </Card>
  );
}

function TeamBoard({ board, link }: { board: Load<Board>; link: boolean }) {
  const trouble = problem(board);
  return (
    <Card>
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
