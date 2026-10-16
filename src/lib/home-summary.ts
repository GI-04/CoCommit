// Pure helpers for the short summaries on Home's shortcut cards (PLAN/2026-10-16-glass-buttons-spines.md, item 4):
// "2h ago", first lines, markdown stripped, and the lines each card shows. No imports, so tests and the browser
// can both load it. Each *Summary function returns the lines for a card; an empty list means "show nothing extra".

const MINUTE = 60_000;
/** Longest summary line kept; the card also clips with an ellipsis, this only stops a huge message filling the page. */
const LINE_MAX = 140;

/** "just now", "5 min ago", "2h ago", "3 days ago", then the date. A bad date gives "", a clock a little ahead "just now". */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const ms = now.getTime() - then.getTime();
  if (ms < MINUTE) return "just now";
  const minutes = Math.floor(ms / MINUTE);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString("en", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** Any run of spaces and line breaks becomes one space. */
export const oneLine = (text: string): string => String(text ?? "").replace(/\s+/g, " ").trim();

/** The first line that has something on it, trimmed ("" if there is none). */
export function firstLine(text: string): string {
  for (const line of String(text ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

/** At most `max` characters on one line, ending in "…" when it was cut (counts characters, not UTF-16 halves). */
export function truncate(text: string, max: number): string {
  const line = oneLine(text);
  const chars = Array.from(line);
  if (chars.length <= max) return line;
  return `${chars.slice(0, Math.max(0, max - 1)).join("").trimEnd()}…`;
}

/** One line of markdown as plain text: no quote, heading or list marks, no **bold**, `code` or link syntax. */
export function stripMarkdown(text: string): string {
  return String(text ?? "")
    .replace(/^\s*(?:>\s*)*/, "") // quote marks
    .replace(/^#{1,6}\s+/, "") // heading marks
    .replace(/^(?:[-*+]|\d{1,3}[.)])\s+/, "") // list marker: "- ", "* ", "2. ", "3) "
    .replace(/^\[[ xX]\]\s+/, "") // task box
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // [text](url), ![alt](url)
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1") // [text][ref]
    .replace(/<(https?:\/\/[^>\s]+)>/g, "$1") // <https://…>
    .replace(/`+([^`]*)`+/g, "$1") // `code`
    .replace(/(\*\*|__|~~)(.+?)\1/g, "$2") // **bold**, __bold__, ~~strike~~
    .replace(/(^|[\s(])([*_])(\S(?:.*?\S)?)\2(?=$|[\s).,;:!?])/g, "$1$3") // *italic*, _italic_ (not snake_case)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The first line under a heading that contains "next step" (any level, any case), as plain text.
 * A heading with nothing under it is skipped for the next such heading; null if there is none.
 */
export function nextStepLine(md: string): string | null {
  const lines = String(md ?? "").replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s{0,3}#{1,6}\s+.*next step/i.test(lines[i])) continue;
    for (const raw of lines.slice(i + 1)) {
      if (/^\s{0,3}#{1,6}\s/.test(raw)) break; // the next heading: this section had nothing
      const text = stripMarkdown(raw);
      if (text) return text;
    }
  }
  return null;
}

/** A chat line as plain text: one line, no links (a git event ends with its GitHub link), no dangling "·". */
export function chatText(text: string): string {
  return oneLine(String(text ?? "").replace(/https?:\/\/\S+/g, "")).replace(/\s*[·|]\s*$/, "").trim();
}

/** Repository card: the latest commit's message, then "author · 2h ago". */
export function commitSummary(commit: { author: string; text: string; at: string }, now = new Date()): string[] {
  const message = truncate(firstLine(commit.text), LINE_MAX);
  if (!message) return [];
  const meta = [oneLine(commit.author), relativeTime(commit.at, now)].filter(Boolean).join(" · ");
  return meta ? [message, meta] : [message];
}

/** Messages card: the last `count` chat lines as "name: text", oldest first (lines with no text are left out). */
export function chatSummary(messages: { author: string; text: string }[], count = 2): string[] {
  return messages
    .slice(-count)
    .map((m) => {
      const text = chatText(m.text);
      const who = oneLine(m.author);
      return text ? truncate(who ? `${who}: ${text}` : text, LINE_MAX) : "";
    })
    .filter(Boolean);
}

/** Agent Context card: "Next:" and the handoff's next step (nothing when there is none). */
export function contextSummary(next: string | null): string[] {
  const text = next ? oneLine(next) : "";
  return text ? [truncate(`Next: ${text}`, LINE_MAX)] : [];
}

/** Drive card: the names of the first `count` files (in the order GitHub lists them: shared files carry no date), then "+N more". */
export function driveSummary(files: { name: string }[], count = 3): string[] {
  const names = files.slice(0, count).map((f) => oneLine(f.name)).filter(Boolean);
  if (names.length === 0) return [];
  const more = files.length - count;
  return more > 0 ? [truncate(names.join(", "), LINE_MAX), `+${more} more`] : [truncate(names.join(", "), LINE_MAX)];
}
