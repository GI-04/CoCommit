"use client";

import { useEffect, useState } from "react";
import { ActivityTab } from "@/components/home/ActivityTab";
import { CardsTab } from "@/components/home/CardsTab";
import { useRepo } from "@/components/home/data";
import { OverviewTab } from "@/components/home/OverviewTab";
import { Icon } from "@/components/icons";
import { Button, PageHeader, Tabs } from "@/components/ui";
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
      <PageHeader title={customizing ? "Customize Home" : "Home"} subtitle={customizing ? "Choose which cards you see and where." : (repo ?? undefined)}>
        <Tabs label="Home views" value={tab} onChange={choose} tabs={TABS} />
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

      {tab === "cards" && <CardsTab repo={repo} customizing={customizing} />}
      {tab === "overview" && <OverviewTab repo={repo} />}
      {tab === "activity" && <ActivityTab repo={repo} />}

    </div>
  );
}
