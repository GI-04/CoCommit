import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Light bending for the liquid glass (PLAN/2026-10-22-liquid-glass.md): the lens map that tells an SVG feDisplacementMap
// where each backdrop pixel is sampled from. 128 = stay put; red moves along x, green along y.
const code = ts.transpileModule(readFileSync(new URL("../src/lib/glass-map.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const g = {};
vm.runInNewContext(code, { exports: g, Math, Uint8ClampedArray });

const at = (map, w, x, y) => {
  const i = (y * w + x) * 4;
  return { r: map[i], g: map[i + 1], b: map[i + 2], a: map[i + 3] };
};

test("lensFit keeps the rim inside the element and bends at most about the rim's width", () => {
  const nav = g.lensFit(254, 900, 40);
  assert.equal(nav.radius, 40);
  assert.ok(nav.frost > 0);
  assert.ok(nav.bezel >= 8 && nav.bezel <= 24);
  assert.ok(nav.scale / 2 <= nav.bezel, "the farthest move stays within the rim");
  const pill = g.lensFit(120, 40, 99999); // rounded-full
  assert.equal(pill.radius, 20);
  assert.ok(pill.bezel <= 20);
  const tiny = g.lensFit(10, 6, 99999);
  assert.ok(tiny.bezel <= 3);
});

test("the middle of the glass doesn't bend or show the sharp rim, and every pixel is opaque", () => {
  const w = 200, h = 100;
  const map = g.lensMap(w, h, 20);
  assert.equal(map.length, w * h * 4);
  assert.deepEqual(at(map, w, 100, 50), { r: 128, g: 128, b: 0, a: 255 });
  for (let i = 3; i < map.length; i += 4) assert.equal(map[i], 255);
});

test("near each edge the sample comes from further in, along that edge's normal", () => {
  const w = 200, h = 100;
  const map = g.lensMap(w, h, 20, 16);
  const left = at(map, w, 0, 50), right = at(map, w, w - 1, 50), top = at(map, w, 100, 0), bottom = at(map, w, 100, h - 1);
  assert.ok(left.r > 200 && left.g === 128, "left edge samples to the right");
  assert.ok(right.r < 56 && right.g === 128, "right edge samples to the left");
  assert.ok(top.g > 200 && top.r === 128, "top edge samples downward");
  assert.ok(bottom.g < 56 && bottom.r === 128, "bottom edge samples upward");
  // Symmetric, and strongest at the edge, easing off inward.
  assert.equal(left.r - 128, 128 - right.r);
  const steps = [0, 4, 8, 12, 15].map((x) => at(map, w, x, 50).r);
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] <= steps[i - 1], `bend eases off: ${steps}`);
  assert.equal(at(map, w, 16, 50).r, 128, "nothing past the rim");
  // The sharp rim shows fully at the edge and fades to the frosted middle.
  const rim = [0, 4, 8, 12, 15, 16].map((x) => at(map, w, x, 50).b);
  assert.ok(rim[0] > 240, `rim at the edge: ${rim}`);
  for (let i = 1; i < rim.length; i++) assert.ok(rim[i] <= rim[i - 1], `rim fades: ${rim}`);
  assert.equal(rim[5], 0);
});

test("rounded corners bend diagonally and leave the cut-off corner alone", () => {
  const w = 100, h = 100;
  const map = g.lensMap(w, h, 30, 20);
  assert.deepEqual(at(map, w, 0, 0), { r: 128, g: 128, b: 0, a: 255 }, "outside the rounded corner");
  const d = at(map, w, 12, 12); // inside the top-left corner's rim
  assert.ok(d.r > 128 && d.g > 128, "samples toward the middle on both axes");
  assert.ok(Math.abs(d.r - d.g) <= 1, "on the diagonal both axes bend equally");
});

test("odd and fractional sizes round to whole pixels", () => {
  const map = g.lensMap(33.4, 20.6, 10);
  assert.equal(map.length, 33 * 21 * 4);
});
