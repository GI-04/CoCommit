"use client";

import { usePathname } from "next/navigation";
import { AssistantProvider } from "@/components/Assistant";
import { CallProvider } from "@/components/CallProvider";
import { Nav } from "@/components/Nav";

// The landing page at "/" and the login screens (/login, /login/forgot, /login/reset) are full-screen and bring their
// own header; every app page gets the glass navigation.
// CallProvider wraps both, so a call keeps going whichever page you open.
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const fullScreen = path === "/" || path.startsWith("/login");
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
