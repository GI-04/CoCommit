import type { ReactNode } from "react";
import { inlineText, parseMarkdown, type Block, type Inline } from "@/lib/markdown-lite";

// Renders Markdown (src/lib/markdown-lite.ts) as React elements: no HTML strings, so text can't inject markup.
// Dark theme, about 48rem wide. Used by the Legal page.

const headings = {
  1: "text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl",
  2: "mt-10 text-2xl font-semibold leading-snug md:text-3xl",
  3: "mt-9 text-lg font-semibold leading-snug md:text-xl",
  4: "mt-6 text-base font-semibold",
} as const;

const focus = "outline-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2";

export function Markdown({ source }: { source: string }) {
  return <div className="max-w-3xl text-[15px] leading-7 text-white/85 md:text-base md:leading-8">{renderBlocks(parseMarkdown(source))}</div>;
}

function renderBlocks(blocks: Block[]): ReactNode[] {
  let section = ""; // the last heading, to name tables for screen readers
  return blocks.map((block, i) => {
    switch (block.type) {
      case "heading": {
        section = inlineText(block.children);
        const Tag = `h${block.level}` as "h1" | "h2" | "h3" | "h4";
        return (
          <Tag key={i} id={block.id} className={`scroll-mt-20 text-white ${headings[block.level]}`}>
            {renderInline(block.children)}
          </Tag>
        );
      }
      case "paragraph":
        return (
          <p key={i} className="mt-4">
            {renderInline(block.children)}
          </p>
        );
      case "list": {
        const items = block.items.map((item, j) => (
          <li key={j} className="pl-1">
            {renderInline(item.children)}
            {renderBlocks(item.nested)}
          </li>
        ));
        return block.ordered ? (
          <ol key={i} start={block.start} className="mt-4 list-decimal space-y-2 pl-6 marker:text-muted">
            {items}
          </ol>
        ) : (
          <ul key={i} className="mt-4 list-disc space-y-2 pl-6 marker:text-muted">
            {items}
          </ul>
        );
      }
      case "quote":
        return (
          <blockquote key={i} className="mt-4 border-l-2 border-accent-soft pl-4 text-muted">
            {renderBlocks(block.children)}
          </blockquote>
        );
      case "rule":
        return <hr key={i} className="my-10 border-line" />;
      case "table": {
        const columns = block.header.length;
        return (
          // Wide tables scroll sideways inside this box instead of the whole page; it can be focused to scroll with the keyboard.
          <div key={i} tabIndex={0} role="region" aria-label={section ? `${section}, table` : "Table"} className={`mt-4 overflow-x-auto rounded-xl border border-line ${focus}`}>
            <table className="w-full border-collapse text-left text-sm leading-6" style={{ minWidth: `${columns * 8}rem` }}>
              <thead className="bg-white/10 text-white">
                <tr>
                  {block.header.map((cell, c) => (
                    <th key={c} scope="col" className="px-4 py-2.5 font-semibold">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-t border-line align-top">
                    {row.map((cell, c) => (
                      <td key={c} className="px-4 py-2.5 [overflow-wrap:anywhere]">
                        {renderInline(cell)}
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

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return node.text;
      case "br":
        return <br key={i} />;
      case "code":
        return (
          <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.88em] text-white [overflow-wrap:anywhere]">
            {node.text}
          </code>
        );
      case "strong":
        return (
          <strong key={i} className="font-semibold text-white">
            {renderInline(node.children)}
          </strong>
        );
      case "em":
        return <em key={i}>{renderInline(node.children)}</em>;
      case "link": {
        // Web links open in a new tab; mailto: and #anchors stay in place.
        const web = /^https?:/i.test(node.href);
        return (
          <a
            key={i}
            href={node.href}
            {...(web ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`rounded text-accent-soft underline underline-offset-2 hover:text-white [overflow-wrap:anywhere] ${focus}`}
          >
            {renderInline(node.children)}
          </a>
        );
      }
    }
  });
}
