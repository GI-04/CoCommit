import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// SEO pass (PLAN/2026-10-18-seo-pass.md): only "/", "/legal" and the guide are for search engines, and the files
// crawlers and link previews fetch stay public even with the login wall on.
function load(file, modules = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const m = {};
  vm.runInNewContext(code, { exports: m, require: (id) => modules[id] ?? {}, URL });
  return m;
}

const site = load("lib/site.ts");

test("the landing description fits in a Google result", () => {
  assert.ok(site.LANDING_DESCRIPTION.length <= 155, `${site.LANDING_DESCRIPTION.length} characters`);
});

test("sitemap.xml lists only the public pages, as absolute URLs", () => {
  const urls = load("app/sitemap.ts", { "@/lib/site": site }).default().map((e) => e.url);
  // Arrays from the vm realm are copied so deepEqual compares values only.
  assert.deepEqual([...urls], [
    "https://cocommit.vercel.app",
    "https://cocommit.vercel.app/legal",
    "https://cocommit.vercel.app/guide/git-for-beginner-teams",
  ]);
});

test("robots.txt keeps app pages crawlable (so their noindex is seen) and points at the sitemap", () => {
  const r = load("app/robots.ts", { "@/lib/site": site }).default();
  assert.deepEqual([...r.rules.disallow], ["/api/", "/auth/"]);
  assert.equal(r.sitemap, "https://cocommit.vercel.app/sitemap.xml");
});

test("noindex by default; the landing page and Legal opt back in with a canonical URL", () => {
  const root = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(root, /robots: \{ index: false, follow: true \}/);
  for (const [file, path] of [["page.tsx", "/"], ["legal/layout.tsx", "/legal"]]) {
    const src = readFileSync(new URL(`../src/app/${file}`, import.meta.url), "utf8");
    assert.match(src, /robots: \{ index: true, follow: true \}/, file);
    assert.ok(src.includes(`alternates: { canonical: "${path}" }`), file);
  }
});

test("the login wall's proxy skips robots.txt, sitemap.xml, llms.txt, icons and the share image", () => {
  const src = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  const pattern = src.match(/matcher: \[\s*"([^"]+)"/)[1].replaceAll("\\\\", "\\");
  const runs = (p) => new RegExp(`^${pattern}$`).test(p);
  for (const p of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/icon/192", "/apple-icon", "/opengraph-image", "/manifest.webmanifest"]) {
    assert.equal(runs(p), false, `${p} should skip the proxy`);
  }
  for (const p of ["/home", "/repo", "/login", "/"]) assert.equal(runs(p), true, `${p} should run the proxy`);
});

test("the manifest has PNG icons and the canvas colour", () => {
  const m = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  assert.deepEqual(m.icons.map((i) => i.sizes), ["192x192", "512x512"]);
  assert.equal(m.theme_color, "#1f1f1f");
});

// The guide page (PLAN/2026-10-21-seo-guide-page.md): indexed, question headings with short answers, true to the app.
const guide = load("lib/guide.ts", { "@/lib/site": site });
const guidePage = readFileSync(new URL(`../src/app${guide.GUIDE_PATH}/page.tsx`, import.meta.url), "utf8");

test("the guide is in the sitemap, opts in to indexing with its canonical and keeps the root share image", () => {
  assert.ok(site.PUBLIC_PATHS.includes(guide.GUIDE_PATH));
  assert.match(guidePage, /robots: \{ index: true, follow: true \}/);
  assert.ok(guidePage.includes("alternates: { canonical: GUIDE_PATH }"));
  // A page's own openGraph drops og:image from opengraph-image.tsx (GOTCHAS 2026-10-18).
  assert.ok(!/openGraph:/.test(guidePage), "no openGraph in the guide's metadata");
  assert.ok(`${guide.GUIDE_TITLE} · CoCommit`.length <= 60, "tab title fits in a Google result");
  assert.ok(guide.GUIDE_DESCRIPTION.length <= 155, `${guide.GUIDE_DESCRIPTION.length} characters`);
});

test("the guide has one h1, a question for every h2 and a 40-60 word answer under each, about 800 words", () => {
  assert.equal(guidePage.match(/<h1[ >]/g)?.length, 1);
  assert.equal(guidePage.match(/<h2[ >]/g)?.length, 1, "h2s come only from GUIDE_SECTIONS");
  assert.ok(guidePage.includes("GUIDE_SECTIONS.map((s) =>"));
  const ids = guide.GUIDE_SECTIONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "unique anchors");
  for (const s of guide.GUIDE_SECTIONS) {
    assert.match(s.id, /^[a-z0-9-]+$/, s.id);
    assert.match(s.question, /\?$/, s.question);
    const n = guide.countWords(s.answer);
    assert.ok(n >= 40 && n <= 60, `${s.id}: ${n} words`);
  }
  const total = guide.countWords(guide.guideText());
  assert.ok(total >= 700 && total <= 950, `${total} words`);
  assert.equal(guide.countWords("Use `fix-signup-email`, then `! [rejected] main -> main`."), 6);
});

test("the guide's Article data matches the page", () => {
  const a = JSON.parse(JSON.stringify(guide.guideJsonLd()));
  assert.equal(a["@type"], "Article");
  assert.equal(a.headline, guide.GUIDE_TITLE);
  assert.equal(a.description, guide.GUIDE_DESCRIPTION);
  assert.equal(a.url, `https://cocommit.vercel.app${guide.GUIDE_PATH}`);
  assert.match(a.datePublished, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(a.dateModified >= a.datePublished);
  assert.equal(a.publisher["@id"], "https://cocommit.vercel.app/#organization");
  assert.equal(a.wordCount, guide.countWords(guide.guideText()));
  assert.ok(guidePage.includes("guideJsonLd()"));
});

test("the guide links to the landing page and Get started; the landing footer links to the guide", () => {
  assert.ok(guidePage.includes('href="/"'));
  assert.ok(guidePage.includes("<GetStarted"));
  const identity = load("lib/login-identity.ts");
  assert.equal(identity.getStartedHref({ account: false, github: false, demo: false }), "/login?returnTo=/home");
  const landing = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  assert.ok(landing.includes(`href="${guide.GUIDE_PATH}"`));
});

test("guides are full-screen and stay public when the login wall is on", () => {
  const shell = readFileSync(new URL("../src/components/AppShell.tsx", import.meta.url), "utf8");
  const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  assert.ok(guide.GUIDE_PATH.startsWith("/guide/"));
  assert.ok(shell.includes('path.startsWith("/guide/")'));
  assert.ok(proxy.includes('path.startsWith("/guide/")'));
});

// SEO + GEO pass (PLAN/2026-10-21-seo-geo.md): say which CoCommit this is, one FAQ for the page, its data and llms.txt.
test("the title names the product and its audience and fits in a Google result", () => {
  assert.match(site.LANDING_TITLE, /^CoCommit: .*beginner/);
  assert.ok(site.LANDING_TITLE.length <= 60, `${site.LANDING_TITLE.length} characters`);
  assert.match(site.DEFINITION, /^CoCommit is a free /);
});

test("the landing JSON-LD links the organization, site, app and FAQ, and the FAQ matches the page list", () => {
  const graph = JSON.parse(JSON.stringify(site.landingJsonLd()))["@graph"];
  const byType = Object.fromEntries(graph.map((n) => [n["@type"], n]));
  assert.deepEqual(Object.keys(byType).sort(), ["FAQPage", "Organization", "SoftwareApplication", "WebSite"]);
  assert.deepEqual(byType.Organization.sameAs, ["https://github.com/GI-04/CoCommit"]);
  assert.equal(byType.SoftwareApplication.publisher["@id"], byType.Organization["@id"]);
  assert.equal(byType.WebSite.publisher["@id"], byType.Organization["@id"]);
  const qa = byType.FAQPage.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]);
  assert.deepEqual(qa, JSON.parse(JSON.stringify(site.FAQ)));
  assert.deepEqual(qa.slice(0, 3).map(([q]) => q), ["What is CoCommit?", "Is CoCommit free?", "How is CoCommit different from GitHub Desktop?"]);
});

test("the landing page uses the shared title, definition and FAQ instead of its own copies", () => {
  const src = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  for (const name of ["LANDING_TITLE", "{DEFINITION}", "FAQ.map", "landingJsonLd()"]) assert.ok(src.includes(name), name);
  assert.ok(!/const faq = /.test(src), "no second FAQ list in page.tsx");
});

test("llms.txt starts with the name and definition, says which cocommit it is not, and lists every FAQ", () => {
  const txt = site.llmsTxt();
  assert.ok(txt.startsWith(`# CoCommit\n\n> ${site.DEFINITION}\n`));
  assert.match(txt, /not related to the `cocommit` command-line tools/);
  for (const [q, a] of site.FAQ) assert.ok(txt.includes(`### ${q}\n${a}`), q);
  assert.ok(txt.includes("https://github.com/GI-04/CoCommit"));
});

test("verification tags are printed only when a code is filled in", () => {
  const root = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(root, /GOOGLE_SITE_VERIFICATION \? \{ google: GOOGLE_SITE_VERIFICATION \} : \{\}/);
  assert.match(root, /BING_SITE_VERIFICATION \? \{ other: \{ "msvalidate\.01": BING_SITE_VERIFICATION \} \} : \{\}/);
});
