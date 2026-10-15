// Commit activity grid for the home screen (PLAN/2026-10-16-heat-map.md). Pure functions: no imports, safe in browser and tests.

export type CommitDate = { author: string; at: string };
/** `count` is commits that local day; `level` 0 (none) to 4 (busiest). */
export type HeatCell = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };
export type HeatMap = {
  /** Columns of 7 cells, Sunday first, oldest week first; days after today are null. */
  weeks: (HeatCell | null)[][];
  /** Everyone who committed in the window, busiest first. */
  authors: string[];
  /** Commits counted in the window (for the chosen author, if any). */
  total: number;
  /** Start of the window (YYYY-MM-DD), for the GitHub `since` filter. */
  start: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
/** YYYY-MM-DD in the viewer's time zone. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** First day of a `weeks`-week window ending with the week that contains `now` (a Sunday, at local midnight). */
export function windowStart(weeks: number, now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - start.getDay() - (Math.max(1, Math.trunc(weeks)) - 1) * 7);
  return start;
}

/** 0 for no commits; otherwise 1-4 by how close the day is to the busiest day. */
export function levelFor(count: number, max: number): HeatCell["level"] {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as HeatCell["level"];
}

/** Buckets commits by local day into a weeks×7 grid. Commits outside the window or with a bad date are ignored. */
export function buildHeatMap(commits: CommitDate[], weeks = 13, now = new Date(), author?: string): HeatMap {
  const start = windowStart(weeks, now);
  const startKey = dayKey(start);
  const todayKey = dayKey(now);
  const perDay = new Map<string, number>();
  const perAuthor = new Map<string, number>();
  let total = 0;
  for (const c of commits) {
    const when = new Date(c.at);
    if (Number.isNaN(when.getTime())) continue;
    const key = dayKey(when);
    if (key < startKey || key > todayKey) continue;
    perAuthor.set(c.author, (perAuthor.get(c.author) ?? 0) + 1);
    if (author && c.author !== author) continue;
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
    total++;
  }
  const max = Math.max(0, ...perDay.values());
  const grid: (HeatCell | null)[][] = [];
  const day = new Date(start);
  for (let w = 0; w < Math.max(1, Math.trunc(weeks)); w++) {
    const col: (HeatCell | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const key = dayKey(day);
      const count = perDay.get(key) ?? 0;
      col.push(key > todayKey ? null : { date: key, count, level: levelFor(count, max) });
      day.setDate(day.getDate() + 1);
    }
    grid.push(col);
  }
  const authors = [...perAuthor].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  return { weeks: grid, authors, total, start: startKey };
}
