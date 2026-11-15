import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// SEO pass (PLAN/2026-10-18-seo-pass.md): only "/" and "/legal" are for search engines, and the files crawlers and
// link previews fetch stay public even with the login wall on.
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
  assert.deepEqual([...urls], ["https://cocommit.vercel.app", "https://cocommit.vercel.app/legal"]);
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
