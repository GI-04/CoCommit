import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// The shared button look (PLAN/2026-10-16-glass-buttons-spines.md): every button is a pill. A leftover rounded-md next
// to rounded-full once beat it and made the glass buttons square; the bug was in Button itself, so Button is rendered
// here (the jsx mock keeps the element's type and props instead of discarding them).
const code = ts.transpileModule(readFileSync(new URL("../src/components/ui.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const m = {};
const jsx = (type, props) => ({ type, props });
vm.runInNewContext(code, { exports: m, require: () => ({ jsx, jsxs: jsx, Fragment: "Fragment" }), Math, Array });

const radii = (cls) => cls.split(/\s+/).filter((c) => /^rounded(-|$)/.test(c));
const flat = (node) => (node && typeof node === "object" ? [node, ...[node.props?.children].flat().flatMap(flat)] : []);

test("every Button variant renders a single pill radius", () => {
  for (const variant of ["primary", "ghost", "glass", "blue", undefined]) {
    const el = m.Button({ variant, children: "x" });
    assert.equal(el.type, "button");
    assert.deepEqual(radii(el.props.className), ["rounded-full"], `${variant} should be exactly rounded-full`);
  }
  assert.deepEqual(radii(m.buttonClass("glass", "flex items-center")), ["rounded-full"]);
});

test("glass is the secondary look and blue the solid main action", () => {
  assert.match(m.Button({ variant: "glass" }).props.className, /\bbtn-glass\b/);
  assert.match(m.Button({ variant: "blue" }).props.className, /\bbtn-blue\b/);
  assert.match(m.buttonClass("primary", "py-3"), /\bpy-3\b/);
});

test("the button CSS never sets its own radius (unlayered CSS would beat rounded-full)", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  for (const rule of [/\.btn-glass\s*{[^}]*}/, /\.btn-blue\s*{[^}]*}/]) assert.doesNotMatch(css.match(rule)[0], /border-radius/);
});

test("Tabs paper variant has a white track and a black thumb; the glass one keeps the glass look", () => {
  const classes = (props) => flat(m.Tabs({ tabs: [{ id: "a", label: "A" }, { id: "b", label: "B" }], value: "b", onChange() {}, label: "t", ...props })).map((n) => n.props?.className ?? "").join(" ");
  assert.match(classes({ variant: "paper", size: "sm" }), /bg-paper/);
  assert.match(classes({ variant: "paper", size: "sm" }), /bg-black/);
  assert.match(classes({}), /glass-thumb/);
  assert.doesNotMatch(classes({}), /bg-paper/);
});
