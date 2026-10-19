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

test("the login wall's proxy skips robots.txt, sitemap.xml, icons and the share image", () => {
  const src = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  const pattern = src.match(/matcher: \[\s*"([^"]+)"/)[1].replaceAll("\\\\", "\\");
  const runs = (p) => new RegExp(`^${pattern}$`).test(p);
  for (const p of ["/robots.txt", "/sitemap.xml", "/icon/192", "/apple-icon", "/opengraph-image", "/manifest.webmanifest"]) {
    assert.equal(runs(p), false, `${p} should skip the proxy`);
  }
  for (const p of ["/home", "/repo", "/login", "/"]) assert.equal(runs(p), true, `${p} should run the proxy`);
});

test("the manifest has PNG icons and the canvas colour", () => {
  const m = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  assert.deepEqual(m.icons.map((i) => i.sizes), ["192x192", "512x512"]);
  assert.equal(m.theme_color, "#1f1f1f");
});
