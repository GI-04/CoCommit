import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// The shared button look (PLAN/2026-10-16-glass-buttons-spines.md): every button is a pill. A leftover rounded-md next
// to rounded-full once beat it and made the glass buttons square.
const code = ts.transpileModule(readFileSync(new URL("../src/components/ui.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const m = {};
const jsx = () => null;
vm.runInNewContext(code, { exports: m, require: () => ({ jsx, jsxs: jsx, Fragment: null }), Math, Array });

test("every button variant is a pill with no competing radius", () => {
  for (const variant of ["primary", "ghost", "glass", "blue", undefined]) {
    const cls = m.buttonClass(variant);
    assert.match(cls, /\brounded-full\b/, `${variant} should be a pill`);
    assert.doesNotMatch(cls, /\brounded-(sm|md|lg|xl|2xl)\b/, `${variant} must not also set another radius`);
  }
});

test("glass is the secondary look and blue the solid main action", () => {
  assert.match(m.buttonClass("glass"), /\bbtn-glass\b/);
  assert.match(m.buttonClass("blue"), /\bbtn-blue\b/);
  assert.match(m.buttonClass("primary", "py-1"), /\bpy-1\b/);
});

test("the Tabs component is a function that takes a variant", () => {
  assert.equal(typeof m.Tabs, "function");
});
