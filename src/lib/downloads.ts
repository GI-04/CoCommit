export type OsId = "macos" | "windows";

export type Download = {
  id: OsId;
  label: string;
  /** Public path of the installer in `public/downloads/`; null until the file is committed. */
  href: string | null;
};

export const downloads: Download[] = [
  // Set href to "/downloads/CoCommit-macos.dmg" once the file is in public/downloads/.
  { id: "macos", label: "macOS", href: null },
  { id: "windows", label: "Windows", href: null },
];

export function detectOs(userAgent: string): OsId | null {
  // iPhone/iPad user agents contain "like Mac OS X", so rule out touch devices first.
  if (/iphone|ipad|ipod|android/i.test(userAgent)) return null;
  if (/mac/i.test(userAgent)) return "macos";
  if (/win/i.test(userAgent)) return "windows";
  return null;
}
