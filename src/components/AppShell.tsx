"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AssistantProvider } from "@/components/Assistant";
import { CallProvider } from "@/components/CallProvider";
import { Nav } from "@/components/Nav";

// The landing page at "/", the login screens (/login, /login/forgot, /login/reset) and the Legal page (/legal) are
// full-screen and bring their own header; every app page gets the glass navigation.
// CallProvider wraps both, so a call keeps going whichever page you open.
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const fullScreen = path === "/" || path.startsWith("/login") || path.startsWith("/auth/") || path === "/legal";
  useGitHubLoginInBrowser();
  return (
    <CallProvider>
      {fullScreen ? (
        children
      ) : (
        <AssistantProvider>
          <div className="min-h-dvh">
            <Nav />
            <main className="min-w-0 p-4 md:pb-8 md:pl-[112px] md:pr-6 md:pt-10 lg:pl-[316px] lg:pr-8 xl:pl-[340px] xl:pr-[58px] xl:pt-[57px]">
              <div key={path} className="rise">
                {children}
              </div>
            </main>
          </div>
        </AssistantProvider>
      )}
    </CallProvider>
  );
}

// In the desktop app the window can't show GitHub's pages (blank screen), so every "Sign in with GitHub" link opens in the
// system browser instead; /auth/desktop then hands the session back to the app (PLAN/2026-10-16-desktop-github-login.md).
// window.open runs the Rust new-window hook, which sends http(s) links to the system browser.
function useGitHubLoginInBrowser() {
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href");
      if (!href?.startsWith("/api/github/login")) return;
      e.preventDefault();
      e.stopPropagation();
      const url = new URL(href, window.location.origin);
      url.searchParams.set("desktop", "1");
      window.open(url.toString(), "_blank");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}
