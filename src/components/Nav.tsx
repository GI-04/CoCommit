"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useAssistant } from "@/components/Assistant";
import { navItems } from "@/lib/sections";
import { UserChip } from "@/components/UserChip";
import { DownloadButton } from "@/components/DownloadButton";


// One glass navigation in the three Figma sizes (one element, so the account is only loaded once):
// phone = a top bar with a menu button, tablet = an icon rail, desktop = the full sidebar.
export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const assistant = useAssistant();
  useEffect(() => setOpen(false), [path]);

  return (
    <nav
      aria-label="Main navigation"
      className="glass sticky top-3 z-40 mx-3 mt-3 flex flex-col rounded-[28px] px-3 py-2 md:fixed md:inset-y-4 md:left-4 md:mx-0 md:mt-0 md:w-20 md:items-center md:rounded-[40px] md:px-3 md:py-5 lg:inset-y-7 lg:left-7 lg:w-[254px] lg:items-stretch lg:px-4"
    >
      <div className="flex items-center justify-between md:justify-center lg:justify-start lg:px-3 lg:pt-[23px]">
        <Link href="/" aria-label="CoCommit home page" className="flex h-11 items-center px-1 text-white md:h-auto md:pb-3 lg:pb-[30px]">
          <img src="/logo-mark.svg" alt="" className="h-9 w-auto invert md:h-8 lg:h-10" />
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

      <div id="main-links" className={`${open ? "flex" : "hidden"} flex-col gap-1 pb-2 pt-2 md:flex md:items-center md:gap-3 md:py-0 lg:items-stretch lg:gap-2`}>
        {navItems.map((it) => {
          const active = it.href === "/home" ? path === "/home" : it.match.some((m) => path.startsWith(m));
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              title={it.title}
              className={`flex items-center gap-4 rounded-full px-4 py-3 text-[15px] font-medium md:size-12 md:justify-center md:gap-0 md:p-0 lg:size-auto lg:justify-start lg:gap-4 lg:px-5 lg:py-[19px] lg:text-base ${
                active ? "glass-thumb text-white" : "text-white/85 hover:bg-white/10"
              }`}
            >
              <Icon name={it.icon} />
              <span className="md:sr-only lg:not-sr-only">{it.title}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {
            assistant.toggle();
            setOpen(false);
          }}
          aria-pressed={assistant.size === "open"}
          title="Assistant"
          className={`flex items-center gap-4 rounded-full px-4 py-3 text-left text-[15px] font-medium md:size-12 md:justify-center md:gap-0 md:p-0 lg:size-auto lg:justify-start lg:gap-4 lg:px-5 lg:py-[19px] lg:text-base ${
            assistant.size === "open" ? "glass-thumb text-white" : "text-white/85 hover:bg-white/10"
          }`}
        >
          <Icon name="sparkle" />
          <span className="md:sr-only lg:not-sr-only">Assistant</span>
        </button>
      </div>

      <div className={`${open ? "block" : "hidden"} border-t border-white/15 pt-3 md:mt-auto md:block md:w-full md:border-0 md:pt-0`}>
        <DownloadButton className="hidden pb-4 lg:flex" />
        <UserChip />
      </div>
    </nav>
  );
}
