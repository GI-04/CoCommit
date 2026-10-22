"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useAssistant } from "@/components/Assistant";
import { NAV_DEFAULT, NAV_MAX, NAV_RAIL, NAV_WIDTH_KEY, applyNavWidth, navWidthFor, parseNavWidth, stepNavWidth } from "@/lib/nav-width";
import { navItems } from "@/lib/sections";
import { UserChip } from "@/components/UserChip";

// One glass navigation in the three Figma sizes (one element, so the account is only loaded once):
// phone = a top bar with a menu button, tablet = an icon rail, desktop = the full sidebar, which can be dragged wider,
// narrower or into the icon rail by its right edge (useNavResize; the `full:` classes are the full sidebar's look).
export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const assistant = useAssistant();
  useEffect(() => setOpen(false), [path]);
  const active = navItems.findIndex((it) => (it.href === "/home" ? path === "/home" : it.match.some((m) => path.startsWith(m))));
  const { links, thumb } = useSlidingThumb(active, open);
  const resize = useNavResize();

  return (
    <nav
      id="main-nav"
      aria-label="Main navigation"
      className="glass sticky top-3 z-40 mx-3 mt-3 flex flex-col rounded-[28px] px-3 py-2 md:fixed md:inset-y-4 md:left-4 md:mx-0 md:mt-0 md:w-20 md:items-center md:rounded-[40px] md:px-3 md:py-5 lg:inset-y-7 lg:left-7 full:w-(--nav-w) full:items-stretch full:px-4"
    >
      <div className="flex items-center justify-between md:justify-center full:justify-start full:px-3 full:pt-[23px]">
        <Link href="/home" aria-label="CoCommit Home" className="flex h-11 items-center px-1 text-white md:h-auto md:pb-3 full:pb-[30px]">
          <img src="/logo-mark.svg" alt="" className="h-9 w-auto invert md:h-8 full:h-10" />
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="main-links"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
          className="glass-thumb grid size-11 place-items-center rounded-full md:hidden"
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>

      <div ref={links} id="main-links" className={`${open ? "flex" : "hidden"} relative flex-col gap-1 pb-2 pt-2 md:flex md:items-center md:gap-3 md:py-0 full:items-stretch full:gap-2`}>
        {thumb && (
          <span
            aria-hidden
            className="slide-thumb pointer-events-none absolute left-0 top-0"
            style={{ width: thumb.w, height: thumb.h, transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
          >
            <span key={active} className="glass-thumb stretch-y block size-full rounded-full" />
          </span>
        )}
        {navItems.map((it, i) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={i === active ? "page" : undefined}
            title={it.title}
            className={`relative flex items-center gap-4 rounded-full px-4 py-3 text-[15px] font-medium md:size-12 md:justify-center md:gap-0 md:p-0 full:size-auto full:justify-start full:gap-4 full:px-5 full:py-[19px] full:text-base ${
              i !== active ? "text-white/85 hover:bg-white/10" : thumb ? "text-white" : "glass-thumb text-white"
            }`}
          >
            <Icon name={it.icon} />
            <span className="whitespace-nowrap md:sr-only full:not-sr-only">{it.title}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            assistant.toggle();
            setOpen(false);
          }}
          aria-pressed={assistant.size === "open"}
          title="Assistant"
          className={`flex items-center gap-4 rounded-full px-4 py-3 text-left text-[15px] font-medium md:size-12 md:justify-center md:gap-0 md:p-0 full:size-auto full:justify-start full:gap-4 full:px-5 full:py-[19px] full:text-base ${
            assistant.size === "open" ? "glass-thumb text-white" : "text-white/85 hover:bg-white/10"
          }`}
        >
          <Icon name="sparkle" />
          <span className="whitespace-nowrap md:sr-only full:not-sr-only">Assistant</span>
        </button>
      </div>

      <div className={`${open ? "block" : "hidden"} border-t border-white/15 pt-3 md:mt-auto md:block md:w-full md:border-0 md:pt-0`}>
        <UserChip />
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize navigation"
        aria-controls="main-nav"
        aria-valuemin={NAV_RAIL}
        aria-valuemax={NAV_MAX}
        aria-valuenow={resize.width}
        aria-valuetext={resize.width === NAV_RAIL ? "Icons only" : `${resize.width} pixels`}
        tabIndex={0}
        title="Drag to resize · double-click to reset"
        className="nav-resize absolute inset-y-10 -right-2 hidden w-4 select-none lg:block"
        {...resize.handle}
      />
    </nav>
  );
}

// The sidebar's width on desktop (PLAN/2026-10-22-resizable-nav.md): drag its right edge (narrower than RAIL_SNAP snaps
// it to the icon rail), or focus the edge and use ← / → (Home = rail, End = widest, Enter switches between the rail and
// the last full width); a double-click resets it. Saved per device when the drag ends. The width lives on <html>
// (applyNavWidth), where the head script already put the saved one before the first paint.
function useNavResize() {
  const [width, setWidth] = useState(NAV_DEFAULT);
  const now = useRef(NAV_DEFAULT);
  const lastFull = useRef(NAV_DEFAULT);
  const dragFrom = useRef<number | null>(null); // the sidebar's left edge while dragging

  const set = (w: number, save = true) => {
    if (w !== now.current) {
      now.current = w;
      if (w !== NAV_RAIL) lastFull.current = w;
      applyNavWidth(document.documentElement, w);
      setWidth(w);
    }
    if (save) {
      try {
        localStorage.setItem(NAV_WIDTH_KEY, String(w));
      } catch {}
    }
  };

  useLayoutEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(NAV_WIDTH_KEY);
    } catch {}
    const w = parseNavWidth(saved);
    now.current = w;
    if (w !== NAV_RAIL) lastFull.current = w;
    applyNavWidth(document.documentElement, w);
    setWidth(w);
  }, []);

  const endDrag = () => {
    if (dragFrom.current === null) return;
    dragFrom.current = null;
    delete document.documentElement.dataset.navDrag;
    set(now.current);
  };

  const handle = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      dragFrom.current = e.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
      e.currentTarget.setPointerCapture(e.pointerId);
      document.documentElement.dataset.navDrag = "";
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragFrom.current !== null) set(navWidthFor(e.clientX - dragFrom.current), false);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragFrom.current !== null) set(navWidthFor(e.clientX - dragFrom.current), false);
      endDrag();
    },
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onDoubleClick: () => set(NAV_DEFAULT),
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      const w = now.current;
      const next =
        e.key === "ArrowLeft" ? stepNavWidth(w, -1)
        : e.key === "ArrowRight" ? stepNavWidth(w, 1)
        : e.key === "Home" ? NAV_RAIL
        : e.key === "End" ? NAV_MAX
        : e.key === "Enter" ? (w === NAV_RAIL ? lastFull.current : NAV_RAIL)
        : null;
      if (next === null) return;
      e.preventDefault();
      set(next);
    },
  };
  return { width, handle };
}

// The active page's glass thumb, one element that slides from item to item (PLAN/2026-10-22-liquid-glass.md). It is
// measured after layout, so until then (the first paint, a closed phone menu) the active link wears the glass itself.
// Moving down sets data-slide="next", up "back", so the glass stretches the way it goes (.slide-thumb in globals.css).
function useSlidingThumb(active: number, open: boolean) {
  const links = useRef<HTMLDivElement>(null);
  const was = useRef(active);
  const [thumb, setThumb] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const list = links.current;
    if (!list) return;
    if (was.current >= 0 && active >= 0) {
      if (was.current !== active) list.dataset.slide = active > was.current ? "next" : "back";
    } else delete list.dataset.slide; // appearing (e.g. back from Profile): no stretch
    was.current = active;
    const measure = () => {
      const el = active >= 0 ? list.querySelectorAll<HTMLElement>(":scope > a")[active] : undefined;
      setThumb(el?.offsetWidth ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null);
    };
    measure();
    const sizes = new ResizeObserver(measure);
    sizes.observe(list);
    return () => sizes.disconnect();
  }, [active, open]);
  return { links, thumb };
}
