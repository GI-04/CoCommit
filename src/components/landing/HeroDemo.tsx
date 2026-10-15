"use client";

import { useEffect, useRef, useState } from "react";

// The hero's product demo: the same push done in a terminal and in CoCommit.
// On load the terminal plays once and ends in a rejected push, then the window flips to CoCommit,
// which is clickable. With reduced motion it opens straight on the CoCommit view.

const terminal: { text: string; tone?: "cmd" | "err" | "hint" }[] = [
  { text: "$ git add .", tone: "cmd" },
  { text: '$ git commit -m "fix navbar"', tone: "cmd" },
  { text: "[main 4f2a91c] fix navbar" },
  { text: " 2 files changed, 5 insertions(+), 3 deletions(-)" },
  { text: "$ git push", tone: "cmd" },
  { text: "To github.com:team/app.git" },
  { text: " ! [rejected]        main -> main (fetch first)", tone: "err" },
  { text: "error: failed to push some refs to 'github.com:team/app.git'", tone: "err" },
  { text: "hint: Updates were rejected because the remote contains work that you do", tone: "hint" },
  { text: "hint: not have locally. Integrate the remote changes (e.g. 'git pull ...')", tone: "hint" },
  { text: "hint: before pushing again.", tone: "hint" },
];

const files = [
  { path: "src/components/Navbar.tsx", add: 4, del: 2 },
  { path: "src/styles/nav.css", add: 1, del: 1 },
];

type Tab = "terminal" | "cocommit";

const btn =
  "rounded-md px-3 py-1.5 text-sm font-semibold outline-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

export function HeroDemo() {
  const [tab, setTab] = useState<Tab>("terminal");
  const [shown, setShown] = useState(0);
  const touched = useRef(false);

  const [behind, setBehind] = useState(true);
  const [committed, setCommitted] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(terminal.length);
      setTab("cocommit");
      return;
    }
    const timers: number[] = [];
    terminal.forEach((_, i) => timers.push(window.setTimeout(() => setShown(i + 1), 500 + i * 260)));
    timers.push(
      window.setTimeout(() => {
        if (!touched.current) setTab("cocommit");
      }, 500 + terminal.length * 260 + 1800),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const pick = (t: Tab) => {
    touched.current = true;
    setShown(terminal.length);
    setTab(t);
  };

  const getLatest = () => {
    setBehind(false);
    setNote("Got 2 new commits from Kin. You're up to date with main.");
  };
  const commit = () => {
    setCommitted(true);
    setNote("Committed “Fix navbar on small screens”. Push it to share it with the team.");
  };
  const push = () => {
    if (behind) {
      setNote("main has 2 new commits from Kin. Get the latest changes first, then push.");
      return;
    }
    setPushed(true);
    setNote("Pushed to main. The team can see it in chat.");
  };
  const reset = () => {
    setBehind(true);
    setCommitted(false);
    setPushed(false);
    setNote(null);
  };

  const tabClass = (t: Tab) =>
    `${btn} ${tab === t ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_40px_100px_-30px_rgb(79_70_229/0.45)]">
      <div className="flex items-center gap-3 border-b border-line bg-bg px-3 py-2">
        <div role="tablist" aria-label="Same push, two ways" className="flex rounded-lg bg-line/60 p-1">
          <button role="tab" aria-selected={tab === "terminal"} aria-controls="demo-panel" onClick={() => pick("terminal")} className={tabClass("terminal")}>
            Terminal
          </button>
          <button role="tab" aria-selected={tab === "cocommit"} aria-controls="demo-panel" onClick={() => pick("cocommit")} className={tabClass("cocommit")}>
            CoCommit
          </button>
        </div>
        <p className="ml-auto hidden truncate text-sm text-muted sm:block">team/app on main</p>
      </div>

      <div id="demo-panel" role="tabpanel" className="h-[28.5rem] sm:h-[23rem]">
        {tab === "terminal" ? (
          <div className="h-full overflow-hidden bg-[#161821] p-4 font-[family-name:var(--font-mono)] text-[12.5px] leading-6 text-[#cfd3de] sm:p-5 sm:text-[13px]">
            {terminal.slice(0, shown).map((l, i) => (
              <p
                key={i}
                className={`whitespace-pre-wrap break-all ${l.tone === "cmd" ? "text-white" : l.tone === "err" ? "text-[#ff7b72]" : l.tone === "hint" ? "text-[#e3b341]" : ""}`}
              >
                {l.text}
              </p>
            ))}
            {shown < terminal.length && <span className="inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-[#cfd3de]" />}
          </div>
        ) : (
          <div className="grid h-full md:grid-cols-[11rem_minmax(0,1fr)_15rem]">
            <ul className="hidden border-r border-line bg-bg p-3 text-sm md:block" aria-label="App sections">
              {["Repo", "Chat", "Context"].map((s) => (
                <li key={s} className={`rounded-md px-3 py-2 ${s === "Repo" ? "bg-accent text-accent-fg" : "text-muted"}`}>
                  {s}
                </li>
              ))}
            </ul>

            <div className="flex min-w-0 flex-col gap-3 overflow-hidden p-4 sm:p-5">
              {behind ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">main has 2 new commits from Kin.</span>
                  <button onClick={getLatest} className={`${btn} bg-accent text-accent-fg`}>
                    Get latest
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-added/30 bg-added/10 px-3 py-2 text-sm">Up to date with main.</div>
              )}

              <div className="rounded-lg border border-line">
                <p className="border-b border-line px-3 py-2 text-sm font-semibold">{committed ? "No changes" : "2 changed files"}</p>
                {!committed &&
                  files.map((f) => (
                    <label key={f.path} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                      <input type="checkbox" defaultChecked className="accent-[var(--accent)]" />
                      <span className="min-w-0 flex-1 truncate">{f.path}</span>
                      <span className="text-added">+{f.add}</span>
                      <span className="text-removed">−{f.del}</span>
                    </label>
                  ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="Commit message"
                  defaultValue="Fix navbar on small screens"
                  disabled={committed}
                  className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-1.5 text-sm disabled:opacity-50"
                />
                <button onClick={commit} disabled={committed} className={`${btn} bg-accent text-accent-fg`}>
                  Commit
                </button>
                <button onClick={push} disabled={!committed || pushed} className={`${btn} border border-line hover:bg-line/60`}>
                  Push
                </button>
              </div>

              <p aria-live="polite" className="min-h-10 text-sm text-muted">
                {note}
                {pushed && (
                  <button onClick={reset} className="ml-2 font-semibold text-accent underline-offset-2 hover:underline">
                    Run it again
                  </button>
                )}
              </p>
            </div>

            <div className="hidden flex-col gap-2 border-l border-line bg-bg p-4 text-sm md:flex" aria-label="Team chat">
              <p className="font-semibold">Team chat</p>
              <p className="rounded-md bg-line/50 px-2 py-1 text-xs text-muted">Kin pushed 2 commits to main</p>
              <p>
                <span className="font-semibold">Mina</span> navbar looks broken on my phone
              </p>
              <p>
                <span className="font-semibold">You</span> on it
              </p>
              {pushed && <p className="rounded-md bg-added/15 px-2 py-1 text-xs">You pushed 1 commit to main</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
