// Pure helpers for the Home screen (PLAN/2026-10-16-figma-ui.md, phase 2): which cards show and in what order
// ("Customize", kept per device), and short "2h ago" times. No imports, so tests and the browser can both load it.

export const HOME_LAYOUT_KEY = "cocommitHomeCards";
export const HOME_TAB_KEY = "cocommitHomeTab";

export type HomeLayout = { order: string[]; hidden: string[] };

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/**
 * The saved layout made safe for the cards that exist today: unknown ids are dropped, duplicates removed, and cards
 * added since it was saved go to the end. `saved` is whatever came out of localStorage (any JSON, or null).
 */
export function resolveLayout(all: string[], saved: unknown): HomeLayout {
  const obj = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const known = new Set(all);
  const order: string[] = [];
  for (const id of strings(obj.order)) if (known.has(id) && !order.includes(id)) order.push(id);
  for (const id of all) if (!order.includes(id)) order.push(id);
  const hidden = strings(obj.hidden).filter((id, i, list) => known.has(id) && list.indexOf(id) === i);
  return { order, hidden };
}

/** Moves a card one place earlier (-1) or later (+1); at either end nothing changes. */
export function moveCard(layout: HomeLayout, id: string, delta: -1 | 1): HomeLayout {
  const i = layout.order.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= layout.order.length) return layout;
  const order = [...layout.order];
  [order[i], order[j]] = [order[j], order[i]];
  return { ...layout, order };
}

/** Hides a visible card, or shows a hidden one. */
export function toggleCard(layout: HomeLayout, id: string): HomeLayout {
  if (!layout.order.includes(id)) return layout;
  const hidden = layout.hidden.includes(id) ? layout.hidden.filter((h) => h !== id) : [...layout.hidden, id];
  return { ...layout, hidden };
}

/** The cards to show when not customizing, in order. */
export const visibleCards = (layout: HomeLayout): string[] => layout.order.filter((id) => !layout.hidden.includes(id));

const MINUTE = 60_000;

/** "just now", "5m ago", "3h ago", "2d ago", then the date. Bad or future dates read "just now" / "". */
export function timeAgo(iso: string, now = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const ms = now.getTime() - then.getTime();
  if (ms < MINUTE) return "just now";
  const minutes = Math.floor(ms / MINUTE);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en", { month: "short", day: "numeric" });
}
