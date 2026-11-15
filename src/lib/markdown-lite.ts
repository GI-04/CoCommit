// A tiny Markdown reader for the Legal page (PLAN/2026-10-16-legal-page.md) and the Assistant's and @cocommit's answers
// (PLAN/2026-10-22-assistant-markdown.md). Pure: no imports, no React, no HTML output.
// Supported: headings 1-4 (with GitHub-style ids), paragraphs, bullet and numbered lists (nested by indentation),
// blockquotes, horizontal rules, tables, ``` / ~~~ code fences (also inside list items), **bold**, *italic*, `code`,
// [links](url) and bare http(s) URLs / emails.
// A newline inside a paragraph is kept as a line break, which is how docs/LEGAL.md writes its bold sub-labels.
// Not supported on purpose: raw HTML (HTML comments are dropped, other tags show as plain text), images.
// Links: only http, https, mailto and #anchor targets stay links; anything else (javascript:, data:, relative paths) is
// shown as its plain label.

export type Inline =
  | { type: "text"; text: string }
  | { type: "br" }
  | { type: "code"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] };

export type ListItem = { children: Inline[]; nested: Block[] };

export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; id: string; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | { type: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { type: "quote"; children: Block[] }
  | { type: "rule" }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] }
  | { type: "codeblock"; lang: string; text: string };

type Ctx = { slugs: Map<string, number> };

const HEADING = /^ {0,3}(#{1,4})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const MARKER = /^([ \t]*)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;
const QUOTE = /^ {0,3}>[ \t]?(.*)$/;
const TABLE_RULE = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const COMMENT = /^\s*<!--/;
const FENCE = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/;

type Fence = { indent: number; mark: string; info: string };

/** The fence a line opens (``` or ~~~, then an optional language word), or null. A ``` line with another ` is inline code. */
function openFence(line: string): Fence | null {
  const m = FENCE.exec(line);
  if (!m || (m[2][0] === "`" && m[3].includes("`"))) return null;
  return { indent: m[1].length, mark: m[2], info: m[3].trim() };
}

/** True if the line closes the fence: the same character, at least as many, and nothing after. */
const closesFence = (line: string, fence: Fence) => new RegExp(`^ {0,3}${fence.mark[0]}{${fence.mark.length},}[ \\t]*$`).test(line);

/** Turns Markdown text into blocks. Never throws; unknown syntax stays plain text. */
export function parseMarkdown(source: string): Block[] {
  const text = source.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  return parseBlocks(text.split("\n"), { slugs: new Map() });
}

/** The plain text of some inline nodes (used for heading ids). */
export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((n) => (n.type === "text" || n.type === "code" ? n.text : n.type === "br" ? " " : inlineText(n.children)))
    .join("");
}

/** GitHub-style heading id: lower case, punctuation dropped, spaces to hyphens ("1. Who we are" -> "1-who-we-are"). */
export function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "-");
}

/** The link target if it is safe to link to (http, https, mailto or an #anchor), otherwise null. */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href || /[\u0000-\u001f\u007f-\u009f\s]/.test(href)) return null;
  if (/^#\S*$/.test(href)) return href;
  if (/^https?:\/\/[^/?#]+/i.test(href)) return href;
  if (/^mailto:\S+$/i.test(href)) return href;
  return null;
}

const indentWidth = (ws: string) => ws.replace(/\t/g, "    ").length;
const leadingSpace = (line: string) => /^[ \t]*/.exec(line)![0];

function uniqueSlug(text: string, ctx: Ctx): string {
  const base = slugify(text) || "section";
  const seen = ctx.slugs.get(base) ?? 0;
  ctx.slugs.set(base, seen + 1);
  return seen ? `${base}-${seen}` : base;
}

function startsBlock(lines: string[], i: number): boolean {
  const line = lines[i];
  if (HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || MARKER.test(line) || COMMENT.test(line) || openFence(line)) return true;
  return line.includes("|") && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1]) && isTable(line, lines[i + 1]);
}

function isTable(header: string, rule: string): boolean {
  const cells = splitRow(header).length;
  return header.includes("|") && cells > 0 && cells === splitRow(rule).length;
}

function parseBlocks(lines: string[], ctx: Ctx): Block[] {
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    // An HTML comment is dropped (no raw HTML).
    if (COMMENT.test(line)) {
      while (i < lines.length && !lines[i].includes("-->")) i++;
      i++;
      continue;
    }
    // A code fence: every line up to the closing fence (or the end) is code, kept as it is.
    const fence = openFence(line);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !closesFence(lines[i], fence)) {
        code.push(lines[i].replace(new RegExp(`^ {0,${fence.indent}}`), ""));
        i++;
      }
      i++;
      out.push({ type: "codeblock", lang: /^[\w+#.-]{1,20}/.exec(fence.info)?.[0] ?? "", text: code.join("\n") });
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = HEADING.exec(line))) {
      const children = parseInline(m[2]);
      out.push({ type: "heading", level: m[1].length as 1 | 2 | 3 | 4, id: uniqueSlug(inlineText(children), ctx), children });
      i++;
      continue;
    }
    if (RULE.test(line)) {
      out.push({ type: "rule" });
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && (m = QUOTE.exec(lines[i]))) {
        inner.push(m[1]);
        i++;
      }
      out.push({ type: "quote", children: parseBlocks(inner, ctx) });
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1]) && isTable(line, lines[i + 1])) {
      const header = splitRow(line);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        const cells = splitRow(lines[i]);
        // A row is always as wide as the header: short rows are padded, extra cells dropped.
        rows.push(header.map((_, c) => parseInline(cells[c] ?? "")));
        i++;
      }
      out.push({ type: "table", header: header.map((cell) => parseInline(cell)), rows });
      continue;
    }
    if (MARKER.test(line)) {
      const [list, next] = parseList(lines, i, ctx);
      out.push(list);
      i = next;
      continue;
    }
    // Paragraph: runs until a blank line or the start of another block.
    const para = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) {
      para.push(lines[i].trim());
      i++;
    }
    out.push({ type: "paragraph", children: parseInline(para.join("\n")) });
  }
  return out;
}

function parseList(lines: string[], start: number, ctx: Ctx): [Block, number] {
  let i = start;
  const first = MARKER.exec(lines[i])!;
  const base = indentWidth(first[1]);
  const ordered = /^\d/.test(first[2]);
  const items: ListItem[] = [];
  while (i < lines.length) {
    const m = MARKER.exec(lines[i]);
    if (!m || RULE.test(lines[i]) || indentWidth(m[1]) < base || /^\d/.test(m[2]) !== ordered) break;
    const text = [m[3].trim()];
    const nestedLines: string[] = [];
    let fence: Fence | null = null; // a code fence open inside this item
    i++;
    while (i < lines.length) {
      const l = lines[i];
      // Inside a fence, blank lines and markers are code; a line back at the item's own indent ends the item.
      if (fence) {
        if (l.trim() && indentWidth(leadingSpace(l)) <= base) break;
        nestedLines.push(l);
        if (closesFence(l.trimStart(), fence)) fence = null;
        i++;
        continue;
      }
      if (!l.trim()) {
        // A blank line stays inside the list only if the list carries on after it.
        let k = i;
        while (k < lines.length && !lines[k].trim()) k++;
        if (k >= lines.length) break;
        const next = lines[k];
        const nm = MARKER.exec(next);
        const carriesOn = nm ? indentWidth(nm[1]) >= base && !RULE.test(next) : indentWidth(leadingSpace(next)) > base;
        if (!carriesOn) break;
        if (nestedLines.length) nestedLines.push(...lines.slice(i, k)); // keeps nested blocks apart
        i = k;
        continue;
      }
      if (RULE.test(l)) break;
      const lm = MARKER.exec(l);
      const indent = indentWidth(leadingSpace(l));
      if (lm ? indentWidth(lm[1]) <= base : indent <= base) break;
      // More indented than the item: a nested list or code fence, or (before any nested block) a continuation of the item's text.
      fence = openFence(l.trimStart());
      if (lm || fence || nestedLines.length) nestedLines.push(l);
      else text.push(l.trim());
      i++;
    }
    items.push({ children: parseInline(text.join("\n")), nested: nestedLines.length ? parseBlocks(dedent(nestedLines), ctx) : [] });
  }
  return [{ type: "list", ordered, start: ordered ? parseInt(first[2], 10) : 1, items }, i];
}

/** Removes the indent all non-blank lines share, so nested blocks parse like top-level ones. */
function dedent(lines: string[]): string[] {
  const expanded = lines.map((l) => l.replace(/^[ \t]+/, (ws) => ws.replace(/\t/g, "    ")));
  const cut = Math.min(...expanded.filter((l) => l.trim()).map((l) => leadingSpace(l).length));
  return expanded.map((l) => l.slice(Math.min(cut, leadingSpace(l).length)));
}

/** Splits a table row into cell texts; `\|` stays a literal pipe. */
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cell = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") {
      cell += "|";
      i++;
    } else if (s[i] === "|") {
      cells.push(cell.trim());
      cell = "";
    } else cell += s[i];
  }
  cells.push(cell.trim());
  return cells;
}

const ESCAPABLE = /[\\`*_{}[\]()#+\-.!|<>~]/;
const BARE_URL = /https?:\/\/[^\s<>]+/y;
const BARE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/y;

/** Parses inline syntax. `inLink` is set inside a link label, where links and autolinks are not allowed. */
export function parseInline(src: string, inLink = false): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  const flush = () => {
    if (buf) out.push({ type: "text", text: buf });
    buf = "";
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\" && i + 1 < src.length && ESCAPABLE.test(src[i + 1])) {
      buf += src[i + 1];
      i += 2;
      continue;
    }
    if (c === "\n") {
      flush();
      out.push({ type: "br" });
      i++;
      continue;
    }
    if (c === "`") {
      let n = 1;
      while (src[i + n] === "`") n++;
      const fence = "`".repeat(n);
      const end = src.indexOf(fence, i + n);
      if (end > i + n) {
        flush();
        let code = src.slice(i + n, end).replace(/\n/g, " ");
        if (code.length > 2 && code.startsWith(" ") && code.endsWith(" ") && code.trim()) code = code.slice(1, -1);
        out.push({ type: "code", text: code });
        i = end + n;
      } else {
        buf += fence;
        i += n;
      }
      continue;
    }
    if (c === "[" && !inLink) {
      const link = readLink(src, i);
      if (link) {
        const label = parseInline(src.slice(i + 1, link.labelEnd), true);
        const href = safeHref(link.target);
        flush();
        if (!href) out.push(...label);
        else out.push({ type: "link", href, children: label.length ? label : [{ type: "text", text: href }] });
        i = link.end;
        continue;
      }
    }
    if (c === "*" || c === "_") {
      const run = src[i + 1] === c ? 2 : 1;
      const delim = c.repeat(run);
      const inner = i + run;
      const opens = inner < src.length && !/\s/.test(src[inner]) && (c === "*" || i === 0 || !/[\p{L}\p{N}]/u.test(src[i - 1]));
      const close = opens ? findClose(src, inner, delim) : -1;
      if (close > inner) {
        flush();
        out.push({ type: run === 2 ? "strong" : "em", children: parseInline(src.slice(inner, close), inLink) });
        i = close + run;
        continue;
      }
      buf += c;
      i++;
      continue;
    }
    if (!inLink && /[A-Za-z0-9]/.test(c) && (i === 0 || !/[A-Za-z0-9._%+@/-]/.test(src[i - 1]))) {
      const auto = readAutolink(src, i);
      if (auto) {
        flush();
        out.push({ type: "link", href: auto.href, children: [{ type: "text", text: auto.text }] });
        i += auto.text.length;
        continue;
      }
    }
    buf += c;
    i++;
  }
  flush();
  return out;
}

function readAutolink(src: string, i: number): { text: string; href: string } | null {
  BARE_URL.lastIndex = i;
  const url = BARE_URL.exec(src);
  if (url) {
    const text = url[0].replace(/[.,;:!?'")\]]+$/, "");
    const href = safeHref(text);
    return href && /^https?:\/\/./i.test(text) ? { text, href } : null;
  }
  BARE_EMAIL.lastIndex = i;
  const email = BARE_EMAIL.exec(src);
  return email ? { text: email[0], href: `mailto:${email[0]}` } : null;
}

/** `[label](target)` starting at `open`: where the label ends, the raw target and the index after the closing paren. */
function readLink(src: string, open: number): { labelEnd: number; target: string; end: number } | null {
  let depth = 0;
  let labelEnd = -1;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "\\") j++;
    else if (src[j] === "[") depth++;
    else if (src[j] === "]" && --depth === 0) {
      labelEnd = j;
      break;
    }
  }
  if (labelEnd < 0 || src[labelEnd + 1] !== "(") return null;
  depth = 1;
  for (let j = labelEnd + 2; j < src.length; j++) {
    if (src[j] === "(") depth++;
    else if (src[j] === ")" && --depth === 0) {
      // Anything after the first space is a title, which we ignore.
      const target = src.slice(labelEnd + 2, j).trim().split(/\s+/)[0] ?? "";
      return { labelEnd, target, end: j + 1 };
    }
  }
  return null;
}

/** Index of the delimiter that closes an emphasis opened just before `from`, or -1. Skips code spans and escapes. */
function findClose(src: string, from: number, delim: string): number {
  const ch = delim[0];
  for (let j = from; j < src.length; j++) {
    if (src[j] === "\\") {
      j++;
      continue;
    }
    if (src[j] === "`") {
      let n = 1;
      while (src[j + n] === "`") n++;
      const end = src.indexOf("`".repeat(n), j + n);
      j = end > j + n ? end + n - 1 : j + n - 1;
      continue;
    }
    if (src[j] !== ch) continue;
    // A single delimiter skips a doubled one inside it (*a **b** c*).
    if (delim.length === 1 && src[j + 1] === ch) {
      j++;
      continue;
    }
    if (!src.startsWith(delim, j) || j === from || /\s/.test(src[j - 1])) continue;
    // Take the last delimiter of a run, so ***x*** closes after the whole run.
    let end = j;
    while (src[end + delim.length] === ch) end++;
    if (ch === "_" && /[\p{L}\p{N}]/u.test(src[end + delim.length] ?? "")) continue;
    return end;
  }
  return -1;
}
