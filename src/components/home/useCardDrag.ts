"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { autoScrollStep, cardAt, type CardRect } from "@/lib/home";

/** How far (px) the pointer must move before a press becomes a drag, so a click on a button still works. */
const START_PX = 5;
/** Near the top or bottom edge of the window the page scrolls by itself: the size of that zone (px) and the top speed (px per frame). */
const EDGE = 80;
const SPEED = 18;

/** The card being dragged, how far it is from where it sits in the grid, and the card under the pointer (the drop target). */
export type Drag = { id: string; dx: number; dy: number; over: string | null };

// `maxY` is how far the page could scroll when the press began, and `left`/`width` where the card sat: a card lifted with a
// transform adds to the page's scrollable area, so auto-scroll must stop at the real bottom and the card must stay on screen.
type Press = { id: string; pointerId: number; x0: number; y0: number; scroll0: number; maxY: number; left: number; width: number; x: number; y: number; moved: boolean };

// Drag and drop for Home → Customize (PLAN/2026-10-16-home-drag-drop.md). Pointer events, so a mouse, a pen and a finger
// all work. The card follows the pointer and the order only changes on drop (`onDrop(id, overId)`), so cards of different
// sizes can't make it flicker. A mouse grabs a card anywhere except its buttons; a finger or a pen only by an element marked
// data-drag-handle (that element should be `touch-none`), because anywhere else they must keep scrolling the page.
export function useCardDrag({ enabled, onDrop }: { enabled: boolean; onDrop: (id: string, overId: string) => void }) {
  const boxes = useRef(new Map<string, HTMLElement>());
  const press = useRef<Press | null>(null);
  const frame = useRef(0);
  const drop = useRef(onDrop);
  const [drag, setDrag] = useState<Drag | null>(null);

  useEffect(() => {
    drop.current = onDrop;
  });

  const rects = useCallback((): CardRect[] => {
    return [...boxes.current].map(([id, el]) => {
      const r = el.getBoundingClientRect();
      return { id, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
  }, []);

  // Where the dragged card is now (the page may have scrolled since the press) and what is under the pointer.
  const track = useCallback(() => {
    const p = press.current;
    if (!p?.moved) return;
    const dx = Math.min(Math.max(p.x - p.x0, -p.left), window.innerWidth - p.left - p.width);
    setDrag({ id: p.id, dx, dy: p.y - p.y0 + (window.scrollY - p.scroll0), over: cardAt(rects(), p.x, p.y, p.id) });
  }, [rects]);

  const scroll = useCallback(() => {
    const p = press.current;
    if (!p?.moved) {
      frame.current = 0;
      return;
    }
    const step = autoScrollStep(p.y, window.innerHeight, window.scrollY, p.maxY, EDGE, SPEED);
    if (step) {
      window.scrollBy(0, step);
      track();
    }
    frame.current = requestAnimationFrame(scroll);
  }, [track]);

  const end = useCallback(
    (commit: boolean) => {
      const p = press.current;
      press.current = null;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      if (!p?.moved) return;
      const over = commit ? cardAt(rects(), p.x, p.y, p.id) : null;
      setDrag(null);
      if (over) drop.current(p.id, over);
    },
    [rects],
  );

  // The move and the release are listened for on the window, not on the card: the pointer may leave the card, the grid or
  // even the page while it is held, and that must still end the drag. They only act while a press is going on.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = press.current;
      if (!p || e.pointerId !== p.pointerId) return;
      if (e.pointerType === "mouse" && e.buttons === 0) return end(false); // the release was lost (menu, other window): let go
      p.x = e.clientX;
      p.y = e.clientY;
      if (!p.moved) {
        if (Math.hypot(p.x - p.x0, p.y - p.y0) < START_PX) return;
        p.moved = true;
        frame.current = requestAnimationFrame(scroll);
      }
      track();
    };
    const up = (e: PointerEvent) => {
      const p = press.current;
      if (!p || e.pointerId !== p.pointerId) return;
      p.x = e.clientX;
      p.y = e.clientY;
      end(true);
    };
    const cancel = (e: PointerEvent) => {
      if (press.current && e.pointerId === press.current.pointerId) end(false);
    };
    const onScroll = () => track(); // a wheel or trackpad scroll moves the cards under a still pointer
    const letGo = () => end(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", letGo);
    window.addEventListener("contextmenu", letGo);
    document.addEventListener("visibilitychange", letGo);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("blur", letGo);
      window.removeEventListener("contextmenu", letGo);
      document.removeEventListener("visibilitychange", letGo);
    };
  }, [end, scroll, track]);

  // Escape puts the card back; so does leaving Customize in the middle of a drag.
  useEffect(() => {
    if (!enabled) end(false);
  }, [enabled, end]);
  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && end(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drag, end]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /** Put on each card's box so its place on screen is known. */
  const ref = (id: string) => (el: HTMLElement | null) => {
    if (el) boxes.current.set(id, el);
    else boxes.current.delete(id);
  };

  /** The handler that starts a press on one card's box. */
  const bind = (id: string) => ({
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (!enabled) return;
      if (press.current && !e.isPrimary) return; // a second finger
      if (press.current) end(false); // a new first press while one is still open: that one was lost
      if (e.pointerType === "mouse" && (e.button !== 0 || e.ctrlKey)) return;
      const target = e.target as HTMLElement;
      const handle = target.closest("[data-drag-handle]");
      // Only a mouse grabs a card anywhere (except its buttons); a finger or a pen would pan the page, so they use the handle.
      if (e.pointerType === "mouse" ? !handle && target.closest("button, a, input, select, textarea") : !handle) return;
      const box = e.currentTarget.getBoundingClientRect();
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      press.current = { id, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, scroll0: window.scrollY, maxY, left: box.left, width: box.width, x: e.clientX, y: e.clientY, moved: false };
    },
  });

  return { drag, ref, bind };
}
