"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActivityTab } from "@/components/home/ActivityTab";
import { CardsTab } from "@/components/home/CardsTab";
import { useDemoShown, useRepo } from "@/components/home/data";
import { OverviewTab } from "@/components/home/OverviewTab";
import { logInHref } from "@/components/home/Trouble";
import { Icon } from "@/components/icons";
import { Button, buttonClass, PageHeader, Tabs } from "@/components/ui";
import { HOME_TAB_KEY } from "@/lib/home";

type Tab = "cards" | "overview" | "activity";
const TABS = [
  { id: "cards", label: "Cards" },
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
];

// Home (Figma "Home", "Home · Overview", "Home · Activity", "Home · Customize"). Which tab was open last is kept
// in this browser, like the card layout.
export default function HomePage() {
  const repo = useRepo();
  const [tab, setTab] = useState<Tab>("cards");
  const [customizing, setCustomizing] = useState(false);
  // Signed out, the data cards show a made-up team (PLAN/2026-10-18-home-ux-fixes.md); this says so once, at the top.
  const demo = useDemoShown();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HOME_TAB_KEY);
      if (saved === "overview" || saved === "activity") setTab(saved);
    } catch {}
  }, []);

  const choose = (id: string) => {
    setTab(id as Tab);
    setCustomizing(false);
    try {
      localStorage.setItem(HOME_TAB_KEY, id);
    } catch {}
  };

  return (
    <div className="max-w-6xl">
      <PageHeader title={customizing ? "Customize Home" : "Home"} subtitle={customizing ? "Choose which cards you see and where." : demo ? "Demo team" : (repo ?? undefined)}>
        <Tabs label="Home views" value={tab} onChange={choose} tabs={TABS} className="max-sm:w-full" />
        {tab === "cards" ? (
          <Button variant={customizing ? "blue" : "glass"} onClick={() => setCustomizing((c) => !c)} className="flex items-center gap-2 py-3 lg:px-5 lg:py-[13px] lg:text-base">
            {customizing ? (
              "Done"
            ) : (
              <>
                <Icon name="sliders" className="size-4" /> Customize
              </>
            )}
          </Button>
        ) : (
          <span className="hidden w-[8.5rem] lg:block" aria-hidden />
        )}
      </PageHeader>

      {demo && (
        <div className="glass mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg px-5 py-4 text-white">
          <p className="min-w-0 flex-1 text-sm">
            <span className="mr-2 inline-flex items-center rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-black">Demo</span>
            You&apos;re seeing a made-up team so you can try Home. Log in to see your own repo.
          </p>
          <Link href={logInHref("/home")} className={buttonClass("blue", "inline-block")}>
            Log in
          </Link>
        </div>
      )}

      {tab === "cards" && <CardsTab repo={repo} customizing={customizing} />}
      {tab === "overview" && <OverviewTab repo={repo} />}
      {tab === "activity" && <ActivityTab repo={repo} />}

    </div>
  );
}
