"use client";

import { useEffect, useRef } from "react";
import { lensFit, lensMap } from "@/lib/glass-map";

// The live parts of the liquid glass (PLAN/2026-10-22-liquid-glass.md), mounted once in AppShell:
// - pointer light: the glass under the pointer gets --lx / --ly (where the light is, in % of its box); globals.css draws
//   the highlight there while it's hovered or pressed;
// - light bending: in Chromium every glass surface and glass button gets an SVG lens filter as its backdrop-filter
//   (--lens), rebuilt when its size changes. Safari and Firefox can't use SVG filters on the backdrop and keep the CSS
//   glass.

// Everything that catches the light; thumbs sit inside a glass track and are lit with it.
const LIT = ".glass, .glass-thumb, .btn-glass";
// Everything that bends light.
const LENS = ".glass, .btn-glass";
const SVG = "http://www.w3.org/2000/svg";

export function GlassEffects() {
  const defs = useRef<SVGSVGElement>(null);
  usePointerLight();
  useLightBending(defs);
  return <svg ref={defs} aria-hidden width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} />;
}

function usePointerLight() {
  useEffect(() => {
    let frame = 0;
    let last: PointerEvent | null = null;
    const place = (el: HTMLElement, e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return;
      el.style.setProperty("--lx", `${(((e.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
      el.style.setProperty("--ly", `${(((e.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
    };
    const paint = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      // The glass under the pointer, the glass around it (a button on a glass bar) and their thumbs, which the pointer
      // never hits (pointer-events: none) but which should catch the same light.
      let el = (e.target as Element | null)?.closest?.<HTMLElement>(LIT) ?? null;
      while (el) {
        place(el, e);
        el.querySelectorAll<HTMLElement>(".glass-thumb").forEach((thumb) => place(thumb, e));
        el = el.parentElement?.closest<HTMLElement>(LIT) ?? null;
      }
    };
    const onPointer = (e: PointerEvent) => {
      last = e;
      if (e.type === "pointerdown") paint();
      else frame ||= requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerdown", onPointer, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerdown", onPointer);
      cancelAnimationFrame(frame);
    };
  }, []);
}

// Chromium-only: other engines either ignore url() in backdrop-filter or drop the whole blur.
function canBendLight() {
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
  return (
    !!brands?.some((b) => b.brand === "Chromium") &&
    CSS.supports("backdrop-filter", "url(#a) blur(1px)") &&
    !matchMedia("(prefers-reduced-transparency: reduce)").matches
  );
}

function useLightBending(defs: React.RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    const svg = defs.current;
    if (!svg || !canBendLight()) return;
    const root = document.documentElement;
    root.dataset.refract = "";

    // One filter per size and radius, shared by every element of that shape (a page of same-size buttons needs one).
    const filters = new Map<string, { id: string; filter: SVGFilterElement; users: number }>();
    const shapeOf = new Map<HTMLElement, string>();
    let count = 0;

    // The filter: the frosted backdrop (blurred, edges extended so the blur doesn't fade out at the border), and on top
    // of it the bent backdrop, shown only along the rim (the map's blue channel as its alpha).
    const makeFilter = (w: number, h: number, radius: number) => {
      const { bezel, scale, frost } = lensFit(w, h, radius);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")?.putImageData(new ImageData(lensMap(w, h, radius, bezel), w, h), 0, 0);
      const filter = document.createElementNS(SVG, "filter");
      const id = `cc-lens-${++count}`;
      const attrs = (el: Element, a: Record<string, string | number>) => Object.entries(a).forEach(([k, v]) => el.setAttribute(k, String(v)));
      attrs(filter, { id, x: 0, y: 0, width: w, height: h, filterUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" });
      const image = document.createElementNS(SVG, "feImage");
      attrs(image, { href: canvas.toDataURL(), x: 0, y: 0, width: w, height: h, preserveAspectRatio: "none", result: "map" });
      const soft = document.createElementNS(SVG, "feGaussianBlur");
      attrs(soft, { in: "SourceGraphic", stdDeviation: frost, edgeMode: "duplicate", result: "soft" });
      const bend = document.createElementNS(SVG, "feDisplacementMap");
      attrs(bend, { in: "SourceGraphic", in2: "map", scale, xChannelSelector: "R", yChannelSelector: "G", result: "bent" });
      const rim = document.createElementNS(SVG, "feColorMatrix");
      attrs(rim, { in: "map", type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0", result: "rim" });
      const sharp = document.createElementNS(SVG, "feComposite");
      attrs(sharp, { in: "bent", in2: "rim", operator: "in", result: "sharp" });
      const glass = document.createElementNS(SVG, "feComposite");
      attrs(glass, { in: "sharp", in2: "soft", operator: "over" });
      filter.append(image, soft, bend, rim, sharp, glass);
      svg.append(filter);
      return { id, filter, users: 0 };
    };

    const release = (el: HTMLElement) => {
      const shape = shapeOf.get(el);
      const entry = shape ? filters.get(shape) : undefined;
      shapeOf.delete(el);
      if (!entry || !shape) return;
      if (--entry.users <= 0) {
        entry.filter.remove();
        filters.delete(shape);
      }
    };

    const fit = (el: HTMLElement) => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (!w || !h) return;
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      const shape = `${w}x${h}r${Math.round(Math.min(radius, w / 2, h / 2))}`;
      if (shapeOf.get(el) === shape) return;
      release(el);
      let entry = filters.get(shape);
      if (!entry) filters.set(shape, (entry = makeFilter(w, h, radius)));
      entry.users++;
      shapeOf.set(el, shape);
      el.style.setProperty("--lens", `url(#${entry.id})`);
    };

    // Sizes change while a window is dragged wider: refit once things settle.
    const waiting = new Set<HTMLElement>();
    let settle = 0;
    const sizes = new ResizeObserver((entries) => {
      entries.forEach((e) => waiting.add(e.target as HTMLElement));
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        waiting.forEach((el) => el.isConnected && fit(el));
        waiting.clear();
      }, 120);
    });

    const watched = new Set<HTMLElement>();
    let scanFrame = 0;
    const scan = () => {
      scanFrame = 0;
      document.querySelectorAll<HTMLElement>(LENS).forEach((el) => {
        if (watched.has(el)) return;
        watched.add(el);
        sizes.observe(el);
        fit(el);
      });
      watched.forEach((el) => {
        if (el.isConnected && el.matches(LENS)) return;
        watched.delete(el);
        sizes.unobserve(el);
        release(el);
        el.style.removeProperty("--lens");
      });
    };
    const changes = new MutationObserver(() => (scanFrame ||= requestAnimationFrame(scan)));
    changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    scan();

    return () => {
      changes.disconnect();
      sizes.disconnect();
      cancelAnimationFrame(scanFrame);
      clearTimeout(settle);
      watched.forEach((el) => el.style.removeProperty("--lens"));
      filters.forEach((f) => f.filter.remove());
      delete root.dataset.refract;
    };
  }, [defs]);
}
