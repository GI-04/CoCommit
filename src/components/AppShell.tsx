"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AssistantProvider } from "@/components/Assistant";
import { CallProvider } from "@/components/CallProvider";
import { Nav } from "@/components/Nav";
import { newSignIn, rememberSignIn, type PendingSignIn } from "@/lib/desktop-login";

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
// The sign-in carries a challenge whose verifier stays in this window, so only this window can finish it (desktop-login.ts).
function useGitHubLoginInBrowser() {
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    // Made ahead of the click, because hashing is async and window.open belongs in the click itself.
    let ready: PendingSignIn | null = null;
    const prepare = () => void newSignIn().then((p) => (ready = p), () => (ready = null));
    const open = (href: string, signIn: PendingSignIn) => {
      rememberSignIn(signIn.verifier);
      const url = new URL(href, window.location.origin);
      url.searchParams.set("desktop", "1");
      url.searchParams.set("challenge", signIn.challenge);
      window.open(url.toString(), "_blank");
      ready = null;
      prepare();
    };
    prepare();
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href");
      if (!href?.startsWith("/api/github/login")) return;
      e.preventDefault();
      e.stopPropagation();
      if (ready) open(href, ready);
      else void newSignIn().then((p) => open(href, p));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}
