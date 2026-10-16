import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// The tiny Markdown reader behind the Legal page (PLAN/2026-10-16-legal-page.md).
const code = ts.transpileModule(readFileSync(new URL("../src/lib/markdown-lite.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const m = {};
vm.runInNewContext(code, { exports: m });

// Plain local objects, so deepEqual doesn't trip over the other realm's Array and Object.
const plain = (x) => JSON.parse(JSON.stringify(x));
const parse = (src) => plain(m.parseMarkdown(src));
const inline = (src) => plain(m.parseInline(src));
const text = (t) => ({ type: "text", text: t });
const links = (nodes) => nodes.filter((n) => n.type === "link");

// Every node of a block/inline tree, depth first.
function* walk(node) {
  yield node;
  for (const key of ["children", "nested", "items", "header"]) for (const child of node[key] ?? []) yield* walk(child);
  for (const row of node.rows ?? []) for (const cell of row) for (const child of cell) yield* walk(child);
  if (node.type === "table") for (const cell of node.header) for (const child of cell) yield* walk(child);
}
const everything = (blocks) => blocks.flatMap((b) => [...walk(b)]);

test("headings 1-4 get GitHub-style ids; five hashes are just text", () => {
  const blocks = parse("# CoCommit Legal\n\n## Privacy Policy\n### 1. Who we are\n#### Fine print ##\n##### too deep\n");
  assert.deepEqual(blocks.slice(0, 4).map((b) => [b.type, b.level, b.id]), [
    ["heading", 1, "cocommit-legal"],
    ["heading", 2, "privacy-policy"],
    ["heading", 3, "1-who-we-are"],
    ["heading", 4, "fine-print"],
  ]);
  assert.equal(blocks[4].type, "paragraph");
});

test("repeated headings get -1, -2 and a bold heading uses its plain text", () => {
  const ids = parse("## Notes\n## Notes\n## Notes\n## **Cookies** and `storage`!\n").map((b) => b.id);
  assert.deepEqual(ids, ["notes", "notes-1", "notes-2", "cookies-and-storage"]);
  assert.equal(m.slugify("  Copyright & intellectual property "), "copyright-intellectual-property");
});

test("paragraphs split on blank lines and keep line breaks inside", () => {
  const blocks = parse("one\ntwo\n\nthree  \n");
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0].children, [text("one"), { type: "br" }, text("two")]);
  assert.deepEqual(blocks[1].children, [text("three")]);
});

test("a list can follow a paragraph without a blank line", () => {
  const blocks = parse("**a. Data**\n- first\n- second\n");
  assert.deepEqual(blocks.map((b) => b.type), ["paragraph", "list"]);
  assert.equal(blocks[1].items.length, 2);
});

test("bullet, numbered and nested lists", () => {
  const [bullets, numbers] = parse("- one\n- two\n  - nested a\n  - nested b\n- three\n\n3. third\n4. fourth\n");
  assert.equal(bullets.ordered, false);
  assert.equal(bullets.items.length, 3);
  assert.deepEqual(bullets.items[1].children, [text("two")]);
  assert.equal(bullets.items[1].nested[0].type, "list");
  assert.deepEqual(bullets.items[1].nested[0].items.map((i) => i.children[0].text), ["nested a", "nested b"]);
  assert.equal(bullets.items[2].nested.length, 0);
  assert.equal(numbers.ordered, true);
  assert.equal(numbers.start, 3);
  assert.equal(numbers.items.length, 2);
});

test("a list ends at a heading or a different marker type, and an item can wrap", () => {
  const blocks = parse("- a\n  more of a\n- b\n1. x\n\n## Next");
  assert.deepEqual(blocks.map((b) => b.type), ["list", "list", "heading"]);
  assert.deepEqual(blocks[0].items[0].children, [text("a"), { type: "br" }, text("more of a")]);
  assert.equal(blocks[1].ordered, true);
});

test("bold, italic, code and escapes", () => {
  assert.deepEqual(inline("a **b** *c* _d_ `e`"), [
    text("a "),
    { type: "strong", children: [text("b")] },
    text(" "),
    { type: "em", children: [text("c")] },
    text(" "),
    { type: "em", children: [text("d")] },
    text(" "),
    { type: "code", text: "e" },
  ]);
  assert.deepEqual(inline("***both***"), [{ type: "strong", children: [{ type: "em", children: [text("both")] }] }]);
  assert.deepEqual(inline("**bold with `**` code**"), [{ type: "strong", children: [text("bold with "), { type: "code", text: "**" }, text(" code")] }]);
  assert.deepEqual(inline("\\*not italic\\*"), [text("*not italic*")]);
});

test("stray stars and snake_case words stay plain text", () => {
  assert.deepEqual(inline("2 * 3 * 4"), [text("2 * 3 * 4")]);
  assert.deepEqual(inline("a **b"), [text("a **b")]);
  assert.deepEqual(inline("cc_github_state"), [text("cc_github_state")]);
  assert.deepEqual(inline("`cc_github_state`"), [{ type: "code", text: "cc_github_state" }]);
});

test("links keep http, https, mailto and #anchor targets", () => {
  const nodes = inline("[a](https://example.com/x?y=1) [b](http://example.com) [c](mailto:me@example.com) [d](#privacy-policy)");
  assert.deepEqual(links(nodes).map((l) => l.href), ["https://example.com/x?y=1", "http://example.com", "mailto:me@example.com", "#privacy-policy"]);
  assert.deepEqual(links(nodes)[0].children, [text("a")]);
  // Bold inside a label, a title after the URL, and brackets and parentheses in the target.
  const fancy = inline('[**Privacy** policy](https://example.com/a_(b) "Title")');
  assert.equal(fancy.length, 1);
  assert.equal(fancy[0].href, "https://example.com/a_(b)");
  assert.equal(fancy[0].children[0].type, "strong");
});

test("a javascript: link is dropped and only its label is shown", () => {
  for (const bad of ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)", "data:text/html,<b>x</b>", "vbscript:x", "/home", "../x", "//evil.example", "file:///etc/passwd"]) {
    const nodes = inline(`[click me](${bad})`);
    assert.equal(links(nodes).length, 0, bad);
    assert.deepEqual(nodes, [text("click me")], bad);
  }
  assert.equal(m.safeHref("https:"), null);
  assert.equal(m.safeHref("mailto:"), null);
  assert.equal(m.safeHref("https://a b"), null);
});

test("bare URLs and emails become links, trailing punctuation does not", () => {
  const nodes = inline("See https://cocommit.vercel.app, or write kin.kin@example.com.");
  assert.deepEqual(links(nodes).map((l) => l.href), ["https://cocommit.vercel.app", "mailto:kin.kin@example.com"]);
  assert.deepEqual(nodes.at(-1), text("."));
  // Not inside code spans or link labels, and no link without a host.
  assert.equal(links(inline("`https://example.com`")).length, 0);
  assert.equal(links(inline("[https://example.com](https://example.com)")).length, 1);
  assert.equal(links(inline("see https:// and name@host")).length, 0);
});

test("raw HTML is never produced: tags stay text and comments are dropped", () => {
  assert.deepEqual(inline("<b>hi</b> <script>alert(1)</script>"), [text("<b>hi</b> <script>alert(1)</script>")]);
  const blocks = parse("before\n\n<!-- hidden\n- not a list\n-->\n\nafter\n\n<!-- one line -->\nlast");
  assert.deepEqual(blocks.map((b) => b.type), ["paragraph", "paragraph", "paragraph"]);
  assert.ok(!JSON.stringify(blocks).includes("hidden"));
  assert.ok(!JSON.stringify(blocks).includes("one line"));
});

test("blockquotes and horizontal rules", () => {
  const blocks = parse("> quoted **text**\n> second line\n\n---\n\n***\n\n- - -\n");
  assert.equal(blocks[0].type, "quote");
  assert.equal(blocks[0].children[0].type, "paragraph");
  assert.deepEqual(blocks.slice(1).map((b) => b.type), ["rule", "rule", "rule"]);
});

test("tables: header, rows, escaped pipes, short and long rows", () => {
  const [table, after] = parse("| Name | Use |\n|---|:---:|\n| `a` | one \\| two |\n| b |\n| c | d | e |\n\nafter");
  assert.equal(table.type, "table");
  assert.deepEqual(table.header, [[text("Name")], [text("Use")]]);
  assert.equal(table.rows.length, 3);
  assert.deepEqual(table.rows[0], [[{ type: "code", text: "a" }], [text("one | two")]]);
  assert.deepEqual(table.rows[1], [[text("b")], []]);
  assert.deepEqual(table.rows[2], [[text("c")], [text("d")]]);
  assert.equal(after.type, "paragraph");
  // A line with a pipe but no rule row below is only text.
  assert.equal(parse("a | b\nc | d")[0].type, "paragraph");
});

test("odd input does not throw", () => {
  for (const src of ["", "\n\n", "[", "[a](", "[a](b", "**", "`", "``a`", "|", "|\n|-", "> ", "- ", "1.", "<!--", "\\", "#", "# ", "\r\n- a\r\n- b\r\n"]) {
    assert.doesNotThrow(() => m.parseMarkdown(src), JSON.stringify(src));
  }
  assert.deepEqual(parse("\r\n- a\r\n- b\r\n")[0].items.length, 2);
});

test("docs/LEGAL.md parses and every in-page link points at an existing heading", () => {
  const blocks = parse(readFileSync(new URL("../docs/LEGAL.md", import.meta.url), "utf8"));
  const nodes = everything(blocks);
  const ids = new Set(nodes.filter((n) => n.type === "heading").map((n) => n.id));
  const all = nodes.filter((n) => n.type === "link");
  const anchors = all.filter((l) => l.href.startsWith("#"));
  assert.ok(anchors.length >= 5, "the contents list and the cross references");
  for (const link of anchors) assert.ok(ids.has(link.href.slice(1)), `${link.href} has no heading`);
  assert.equal(ids.size, nodes.filter((n) => n.type === "heading").length, "heading ids are unique");

  // The five sections, in order, each reachable from the contents list at the top.
  const h2 = nodes.filter((n) => n.type === "heading" && n.level === 2).map((n) => n.id);
  assert.deepEqual(h2, ["privacy-policy", "cookies-and-browser-storage", "terms-of-service", "copyright-and-intellectual-property", "contact"]);
  const contents = new Set(blocks.find((b) => b.type === "list").items.flatMap((i) => i.children.filter((c) => c.type === "link").map((c) => c.href.slice(1))));
  assert.deepEqual([...contents], h2);
  assert.equal(blocks[0].type, "heading");
  assert.equal(blocks[0].level, 1);

  // Every link is safe, the maintainer comment is gone and no Markdown syntax leaked into the text.
  for (const link of all) assert.ok(/^(https?:\/\/|mailto:|#)/.test(link.href), link.href);
  assert.ok(!JSON.stringify(blocks).includes("Maintainer notes"));
  for (const n of nodes.filter((n) => n.type === "text")) assert.ok(!/\*\*|\]\(|`|<!--/.test(n.text), n.text);

  // Tables are rectangular, and the contact table has a mailto link for each person.
  const tables = nodes.filter((n) => n.type === "table");
  assert.ok(tables.length >= 5);
  for (const t of tables) for (const row of t.rows) assert.equal(row.length, t.header.length);
  const mails = tables.at(-1).rows.map((r) => r[1].find((c) => c.type === "link")?.href);
  assert.equal(mails.length, 4);
  for (const href of mails) assert.match(href, /^mailto:.+@.+\..+$/);
});
