// The desktop sidebar's width (PLAN/2026-10-22-resizable-nav.md). Its right edge is dragged between NAV_MIN and NAV_MAX;
// dragged narrower than RAIL_SNAP it snaps to the icon rail (NAV_RAIL, the tablet look). The width is saved per device and
// lives in the CSS variable --nav-w on <html>, with data-nav="rail" when it's the rail; globals.css and the sidebar's
// `full:` classes read them from there.

export const NAV_DEFAULT = 254;
// The longest label, "Agent Context", needs 219 px on one line (16 px text, icon, paddings).
export const NAV_MIN = 224;
export const NAV_MAX = 360;
export const NAV_RAIL = 80;
export const RAIL_SNAP = 140;
/** How far one arrow key press moves the edge. */
export const NAV_STEP = 16;
export const NAV_WIDTH_KEY = "cocommitNavWidth";

/** The width when the edge is dragged to `px` from the sidebar's left side. */
export function navWidthFor(px: number): number {
  if (!Number.isFinite(px)) return NAV_DEFAULT;
  if (px < RAIL_SNAP) return NAV_RAIL;
  return Math.round(Math.min(NAV_MAX, Math.max(NAV_MIN, px)));
}

/** One arrow key press: `dir` 1 wider, -1 narrower. Narrower than NAV_MIN is the rail; wider than the rail opens it. */
export function stepNavWidth(width: number, dir: 1 | -1): number {
  if (width <= NAV_RAIL) return dir > 0 ? NAV_MIN : NAV_RAIL;
  const next = width + dir * NAV_STEP;
  return next < NAV_MIN ? (width > NAV_MIN ? NAV_MIN : NAV_RAIL) : Math.min(NAV_MAX, next);
}

/** A saved value back to a width; anything else (nothing saved, a value from an older range) is the default. */
export function parseNavWidth(saved: string | null | undefined): number {
  const w = Number(saved);
  return isNavWidth(w) ? w : NAV_DEFAULT;
}

function isNavWidth(w: number) {
  return w === NAV_RAIL || (Number.isInteger(w) && w >= NAV_MIN && w <= NAV_MAX);
}

/** Puts a width on the page: the CSS variable, and the rail flag. */
export function applyNavWidth(root: HTMLElement, width: number) {
  root.style.setProperty("--nav-w", `${width}px`);
  if (width === NAV_RAIL) root.dataset.nav = "rail";
  else delete root.dataset.nav;
}

/** Runs in <head> before the first paint (layout.tsx), so a saved width shows at once instead of jumping after load. */
export const NAV_WIDTH_SCRIPT = `try{var w=Number(localStorage.getItem(${JSON.stringify(NAV_WIDTH_KEY)})),r=document.documentElement;if(w===${NAV_RAIL}||(Number.isInteger(w)&&w>=${NAV_MIN}&&w<=${NAV_MAX})){r.style.setProperty("--nav-w",w+"px");if(w===${NAV_RAIL})r.dataset.nav="rail"}}catch(e){}`;
