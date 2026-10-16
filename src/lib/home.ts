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

/**
 * Drops a card on a place (0-based, the place of the card it was dropped on): it takes that place and the cards in
 * between shift by one. A place past either end counts as the end; a bad place or an unknown card changes nothing.
 */
export function moveCardTo(layout: HomeLayout, id: string, toIndex: number): HomeLayout {
  const from = layout.order.indexOf(id);
  if (from < 0 || !Number.isFinite(toIndex)) return layout;
  const to = Math.min(Math.max(Math.trunc(toIndex), 0), layout.order.length - 1);
  if (to === from) return layout;
  const order = layout.order.filter((x) => x !== id);
  order.splice(to, 0, id);
  return { ...layout, order };
}

/** A card's box on screen (viewport pixels, as getBoundingClientRect gives them). */
export type CardRect = { id: string; left: number; top: number; right: number; bottom: number };

/**
 * The card under a point while dragging, never `skipId` (the card being dragged). Each box gets `slop` pixels of grace
 * so the gap between cards counts too; where boxes overlap through that grace the one whose centre is closest wins.
 */
export function cardAt(rects: CardRect[], x: number, y: number, skipId?: string, slop = 12): string | null {
  let best: { id: string; d: number } | null = null;
  for (const r of rects) {
    if (r.id === skipId) continue;
    if (x < r.left - slop || x > r.right + slop || y < r.top - slop || y > r.bottom + slop) continue;
    const d = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2);
    if (!best || d < best.d) best = { id: r.id, d };
  }
  return best ? best.id : null;
}

/**
 * How far (px) to scroll the page this frame while a card is dragged: up (negative) when the pointer is in the top `edge`
 * pixels of the window, down (positive) in the bottom `edge`, faster the closer to the edge. Never past the top, and never
 * past `maxY`, the scroll limit when the drag began: a lifted card adds to the page's scrollable area, so without that
 * limit the page would scroll on into empty space.
 */
export function autoScrollStep(y: number, viewportH: number, scrollY: number, maxY: number, edge = 80, speed = 18): number {
  const share = (v: number) => Math.min(Math.max(v, 0), 1);
  const raw = (share((y - (viewportH - edge)) / edge) - share((edge - y) / edge)) * speed;
  if (raw > 0) return Math.max(0, Math.min(raw, maxY - scrollY));
  if (raw < 0) return Math.min(0, Math.max(raw, -scrollY)) || 0; // `|| 0`: no negative zero
  return 0;
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
