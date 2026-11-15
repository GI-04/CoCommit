import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// The resizable sidebar's width (PLAN/2026-10-22-resizable-nav.md): drag limits, snapping to the rail, arrow keys, the
// saved value and the script that puts it on the page before the first paint.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/nav-width.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const n = {};
vm.runInNewContext(code, { exports: n, Math, Number, String, JSON });

// A stand-in for <html>: its inline style and data-* attributes.
function fakeRoot() {
  const vars = {};
  return { vars, dataset: {}, style: { setProperty: (k, v) => (vars[k] = v) } };
}

function runScript(saved, { throws = false } = {}) {
  const root = fakeRoot();
  const localStorage = {
    getItem: (k) => {
      if (throws) throw new Error("blocked");
      return k === n.NAV_WIDTH_KEY ? saved : null;
    },
  };
  vm.runInNewContext(n.NAV_WIDTH_SCRIPT, { localStorage, document: { documentElement: root }, Number });
  return root;
}

test("a drag clamps to the limits and snaps to the rail when narrow", () => {
  assert.equal(n.navWidthFor(254), 254);
  assert.equal(n.navWidthFor(300.6), 301);
  assert.equal(n.navWidthFor(900), n.NAV_MAX);
  assert.equal(n.navWidthFor(n.RAIL_SNAP), n.NAV_MIN);
  assert.equal(n.navWidthFor(n.RAIL_SNAP - 1), n.NAV_RAIL);
  assert.equal(n.navWidthFor(-40), n.NAV_RAIL);
  assert.equal(n.navWidthFor(NaN), n.NAV_DEFAULT);
});

test("arrow keys step, close into the rail and open out of it", () => {
  assert.equal(n.stepNavWidth(254, 1), 254 + n.NAV_STEP);
  assert.equal(n.stepNavWidth(254, -1), 254 - n.NAV_STEP);
  assert.equal(n.stepNavWidth(n.NAV_MAX - 4, 1), n.NAV_MAX);
  assert.equal(n.stepNavWidth(n.NAV_MIN + 4, -1), n.NAV_MIN, "first stops at the narrowest full width");
  assert.equal(n.stepNavWidth(n.NAV_MIN, -1), n.NAV_RAIL, "then closes into the rail");
  assert.equal(n.stepNavWidth(n.NAV_RAIL, -1), n.NAV_RAIL);
  assert.equal(n.stepNavWidth(n.NAV_RAIL, 1), n.NAV_MIN);
});

test("a saved width is read back, anything odd is the default", () => {
  assert.equal(n.parseNavWidth("300"), 300);
  assert.equal(n.parseNavWidth(String(n.NAV_RAIL)), n.NAV_RAIL);
  for (const odd of [null, undefined, "", "abc", "150", "999", "250.5", "-1"]) assert.equal(n.parseNavWidth(odd), n.NAV_DEFAULT, String(odd));
});

test("applyNavWidth sets the variable and the rail flag", () => {
  const root = fakeRoot();
  n.applyNavWidth(root, n.NAV_RAIL);
  assert.equal(root.vars["--nav-w"], `${n.NAV_RAIL}px`);
  assert.equal(root.dataset.nav, "rail");
  n.applyNavWidth(root, 300);
  assert.equal(root.vars["--nav-w"], "300px");
  assert.equal("nav" in root.dataset, false);
});

test("the head script applies the same widths parseNavWidth accepts", () => {
  assert.equal(runScript("300").vars["--nav-w"], "300px");
  const rail = runScript(String(n.NAV_RAIL));
  assert.equal(rail.vars["--nav-w"], `${n.NAV_RAIL}px`);
  assert.equal(rail.dataset.nav, "rail");
  for (const odd of [null, "", "150", "999", "250.5", "abc"]) {
    const root = runScript(odd);
    assert.deepEqual(root.vars, {}, String(odd));
    assert.equal("nav" in root.dataset, false);
  }
  assert.deepEqual(runScript("300", { throws: true }).vars, {}, "blocked storage doesn't break the page");
});
