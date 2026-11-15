import type { ReactNode } from "react";
import { inlineText, parseMarkdown, type Block, type Inline } from "@/lib/markdown-lite";

// Renders Markdown (src/lib/markdown-lite.ts) as React elements: no HTML strings, so text can't inject markup.
// Two looks:
// - "page": dark theme, about 48rem wide, headings with ids. Used by the Legal page.
// - "reply": compact, inherits the bubble's text size and colour (so it reads on paper-white and on dark), no heading ids
//   (several replies share a page), #anchor links show as text. Used for the Assistant's and @cocommit's answers.

const focus = "outline-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2";

type Look = {
  root: string;
  /** Added to a heading's level for its tag, so a reply's "#" sits under the window's own h2. */
  tagOffset: number;
  headings: Record<1 | 2 | 3 | 4, string>;
  ids: boolean;
  p: string;
  list: string;
  li: string;
  quote: string;
  rule: string;
  table: { wrap: string; columnRem: number; text: string; head: string; cell: string; row: string };
  pre: string;
  code: string;
  strong: string;
  link: string;
};

const LOOKS: Record<"page" | "reply", Look> = {
  page: {
    root: "max-w-3xl text-[15px] leading-7 text-white/85 md:text-base md:leading-8",
    tagOffset: 0,
    headings: {
      1: "scroll-mt-20 text-white text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl",
      2: "scroll-mt-20 text-white mt-10 text-2xl font-semibold leading-snug md:text-3xl",
      3: "scroll-mt-20 text-white mt-9 text-lg font-semibold leading-snug md:text-xl",
      4: "scroll-mt-20 text-white mt-6 text-base font-semibold",
    },
    ids: true,
    p: "mt-4",
    list: "mt-4 space-y-2 pl-6 marker:text-muted",
    li: "pl-1",
    quote: "mt-4 border-l-2 border-accent-soft pl-4 text-muted",
    rule: "my-10 border-line",
    table: { wrap: `mt-4 rounded-xl border border-line ${focus}`, columnRem: 8, text: "text-sm leading-6", head: "bg-white/10 text-white", cell: "px-4 py-2.5", row: "border-line" },
    pre: `mt-4 rounded-xl border border-line bg-white/5 p-4 text-sm leading-6 text-white ${focus}`,
    code: "rounded bg-white/10 px-1.5 py-0.5 text-[0.88em] text-white",
    strong: "font-semibold text-white",
    link: `rounded text-accent-soft underline underline-offset-2 hover:text-white ${focus}`,
  },
  reply: {
    root: "min-w-0 break-words [&>:first-child]:mt-0",
    tagOffset: 2,
    headings: { 1: "mt-3 text-base font-semibold", 2: "mt-3 text-base font-semibold", 3: "mt-3 font-semibold", 4: "mt-2 font-semibold" },
    ids: false,
    p: "mt-2",
    list: "mt-2 space-y-1 pl-5",
    li: "pl-0.5",
    quote: "mt-2 border-l-2 border-current/30 pl-3 opacity-80",
    rule: "my-3 border-current/20",
    table: { wrap: "mt-2 rounded-lg border border-current/20 outline-current focus-visible:outline-2", columnRem: 7, text: "text-xs leading-5", head: "bg-current/5", cell: "px-2.5 py-1.5", row: "border-current/20" },
    pre: "mt-2 rounded-lg border border-current/15 bg-current/5 p-3 text-xs leading-5 outline-current focus-visible:outline-2",
    code: "rounded bg-current/10 px-1 py-px text-[0.9em]",
    strong: "font-semibold",
    link: "rounded font-medium underline underline-offset-2 outline-current hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-1",
  },
};

export function Markdown({ source, variant = "page" }: { source: string; variant?: "page" | "reply" }) {
  const look = LOOKS[variant];
  return <div className={look.root}>{renderBlocks(parseMarkdown(source), look)}</div>;
}

function renderBlocks(blocks: Block[], look: Look): ReactNode[] {
  let section = ""; // the last heading, to name tables for screen readers
  return blocks.map((block, i) => {
    switch (block.type) {
      case "heading": {
        section = inlineText(block.children);
        const Tag = `h${Math.min(6, block.level + look.tagOffset)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
        return (
          <Tag key={i} id={look.ids ? block.id : undefined} className={look.headings[block.level]}>
            {renderInline(block.children, look)}
          </Tag>
        );
      }
      case "paragraph":
        return (
          <p key={i} className={look.p}>
            {renderInline(block.children, look)}
          </p>
        );
      case "list": {
        const items = block.items.map((item, j) => (
          <li key={j} className={look.li}>
            {renderInline(item.children, look)}
            {renderBlocks(item.nested, look)}
          </li>
        ));
        return block.ordered ? (
          <ol key={i} start={block.start} className={`list-decimal ${look.list}`}>
            {items}
          </ol>
        ) : (
          <ul key={i} className={`list-disc ${look.list}`}>
            {items}
          </ul>
        );
      }
      case "quote":
        return (
          <blockquote key={i} className={look.quote}>
            {renderBlocks(block.children, look)}
          </blockquote>
        );
      case "rule":
        return <hr key={i} className={look.rule} />;
      case "codeblock":
        // Long lines scroll sideways inside the block, not the page; it can be focused to scroll with the keyboard.
        return (
          <pre key={i} tabIndex={0} aria-label={block.lang ? `${block.lang} code` : "Code"} className={`overflow-x-auto font-mono ${look.pre}`}>
            <code>{block.text}</code>
          </pre>
        );
      case "table": {
        const { table } = look;
        return (
          // Wide tables scroll sideways inside this box instead of the whole page; it can be focused to scroll with the keyboard.
          <div key={i} tabIndex={0} role="region" aria-label={section ? `${section}, table` : "Table"} className={`overflow-x-auto ${table.wrap}`}>
            <table className={`w-full border-collapse text-left ${table.text}`} style={{ minWidth: `${block.header.length * table.columnRem}rem` }}>
              <thead className={table.head}>
                <tr>
                  {block.header.map((cell, c) => (
                    <th key={c} scope="col" className={`font-semibold ${table.cell}`}>
                      {renderInline(cell, look)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className={`border-t align-top ${table.row}`}>
                    {row.map((cell, c) => (
                      <td key={c} className={`[overflow-wrap:anywhere] ${table.cell}`}>
                        {renderInline(cell, look)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }
  });
}

function renderInline(nodes: Inline[], look: Look): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return node.text;
      case "br":
        return <br key={i} />;
      case "code":
        return (
          <code key={i} className={`font-mono [overflow-wrap:anywhere] ${look.code}`}>
            {node.text}
          </code>
        );
      case "strong":
        return (
          <strong key={i} className={look.strong}>
            {renderInline(node.children, look)}
          </strong>
        );
      case "em":
        return <em key={i}>{renderInline(node.children, look)}</em>;
      case "link": {
        // Without heading ids there is nothing for an #anchor to jump to, so it is just its label.
        if (!look.ids && node.href.startsWith("#")) return <span key={i}>{renderInline(node.children, look)}</span>;
        // Web links open in a new tab; mailto: and #anchors stay in place.
        const web = /^https?:/i.test(node.href);
        return (
          <a key={i} href={node.href} {...(web ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`[overflow-wrap:anywhere] ${look.link}`}>
            {renderInline(node.children, look)}
          </a>
        );
      }
    }
  });
}
