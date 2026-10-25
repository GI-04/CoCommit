"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { noteTone } from "@/lib/desk";
import type { PullRequest } from "@/lib/github-types";

export type DeskNote = { path: string; added: number; removed: number };

const baseName = (p: string) => p.split("/").pop() ?? p;
const TILTS = [3, -2.5, 1.5, -3.5, 2.5, -1.5];

// Every file you changed and haven't saved is a sticky note on your desk (colour = file type). Tap one to open that file.
// While `flying`, the notes tilt and fly into the envelope (`target`), 40 ms apart.
export function Notes({ notes, onOpen, flying, target, small = false }: { notes: DeskNote[]; onOpen: (path: string) => void; flying: boolean; target: RefObject<HTMLElement | null>; small?: boolean }) {
  const refs = useRef(new Map<string, HTMLElement>());
  useLayoutEffect(() => {
    if (!flying || !target.current) return;
    const to = target.current.getBoundingClientRect();
    for (const el of refs.current.values()) {
      const from = el.getBoundingClientRect();
      el.style.setProperty("--fx", `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
      el.style.setProperty("--fy", `${to.top + Math.min(40, to.height / 2) - (from.top + from.height / 2)}px`);
    }
  }, [flying, target]);
  return (
    <ul className={`flex flex-wrap ${small ? "w-[5.5rem] shrink-0 gap-0 [&>li+li]:-ml-7" : "gap-3 px-1 py-2"}`} aria-label="Changed files, not saved yet">
      {notes.map((n, i) => (
        <li key={n.path} className={small ? "" : "rise"} style={{ "--d": `${i * 50}ms` } as React.CSSProperties}>
          <button
            type="button"
            ref={(el) => {
              if (el) refs.current.set(n.path, el);
              else refs.current.delete(n.path);
            }}
            onClick={() => onOpen(n.path)}
            title={n.path}
            aria-label={`${n.path}: ${n.added} added, ${n.removed} removed, not saved yet`}
            className={`note tone-${noteTone(n.path)} block rounded-[3px] text-left ${small ? "size-11 p-1 text-[9px] leading-tight" : "h-24 w-[6.75rem] p-2.5"} ${flying ? "note-fly" : ""}`}
            style={{ "--tilt": `${TILTS[i % TILTS.length]}deg`, "--d": `${i * 40}ms` } as React.CSSProperties}
          >
            <span className={`block truncate font-medium ${small ? "" : "text-sm"}`}>{baseName(n.path)}</span>
            {!small && (
              <>
                <span className="mt-0.5 block font-mono text-xs opacity-85">{`+${n.added} −${n.removed}`}</span>
                <span className="mt-1 block text-xs opacity-70">not saved yet</span>
              </>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

// The envelope: what you changed, which branch it goes to, and Save (one commit with every note on the desk).
export function Envelope({
  message,
  onMessage,
  target,
  base,
  newBranch,
  onNewBranch,
  branchInput,
  onBranchInput,
  onSave,
  busy,
  why,
  messageRef,
  envelopeRef,
  sealing,
  head,
}: {
  message: string;
  onMessage: (m: string) => void;
  target: string;
  base: string;
  newBranch: string;
  onNewBranch: (b: string) => void;
  branchInput: boolean;
  onBranchInput: (open: boolean) => void;
  onSave: () => void;
  busy: boolean;
  /** Why Save can't run yet, or null. */
  why: string | null;
  messageRef?: RefObject<HTMLTextAreaElement | null>;
  envelopeRef?: RefObject<HTMLDivElement | null>;
  sealing: boolean;
  head?: ReactNode;
}) {
  return (
    <div ref={envelopeRef} className={`relative rounded-2xl border-[1.5px] border-black bg-paper px-4 pb-4 pt-9 text-black ${sealing ? "envelope-seal" : ""}`}>
      <svg aria-hidden viewBox="0 0 240 30" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-7 w-full">
        <path d="M2 2 L120 28 L238 2" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {head}
      <h2 className="text-sm font-semibold">Save your changes</h2>
      <textarea
        ref={messageRef}
        value={message}
        onChange={(e) => onMessage(e.target.value)}
        placeholder="What did you change?"
        aria-label="What did you change?"
        rows={3}
        className="mt-2.5 w-full resize-none rounded-xl border border-black bg-white p-2.5 text-sm"
      />
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-black/65">Save to</span>
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-black px-2.5 py-1 font-medium">
          <Icon name="branch" className="size-3.5 shrink-0" />
          <span className="truncate">{target || "…"}</span>
        </span>
        {!branchInput && (
          <button type="button" onClick={() => onBranchInput(true)} className="font-medium underline underline-offset-2">
            New branch
          </button>
        )}
      </div>
      {branchInput && (
        <input
          value={newBranch}
          onChange={(e) => onNewBranch(e.target.value.replace(/\s+/g, "-"))}
          placeholder="new-branch-name"
          aria-label="New branch name"
          className="mt-2 w-full rounded-full border border-black bg-white px-3.5 py-1.5 text-sm"
        />
      )}
      <p className="mt-2 text-xs text-black/65">
        {target === base ? `This saves straight into ${base}, the team's shared copy. Type a new branch name to keep ${base} safe.` : `Saving makes a commit on ${target}. ${base} stays safe.`}
      </p>
      <Button variant="blue" onClick={onSave} disabled={busy || !!why} className="mt-3 w-full py-2.5">
        {busy ? "Saving…" : `Save to ${target || "…"}`}
      </Button>
      {!busy && why && <p className="mt-1.5 text-xs text-black/70">{why}</p>}
    </div>
  );
}

// Step 4: ask the team to add the branch to the default branch (a pull request).
export function AskCard({
  branch,
  base,
  changedCount,
  edits,
  pr,
  prTitle,
  onPrTitle,
  onOpenPr,
  busy,
  cardRef,
}: {
  branch: string;
  base: string;
  changedCount: number;
  edits: number;
  pr: PullRequest | null;
  prTitle: string;
  onPrTitle: (t: string) => void;
  onOpenPr: () => void;
  busy: boolean;
  cardRef?: RefObject<HTMLDivElement | null>;
}) {
  const ready = branch !== base && changedCount > 0;
  return (
    <div ref={cardRef} className={`rounded-2xl border border-dashed border-white/25 p-4 ${ready || pr ? "" : "opacity-75"}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden className={`grid size-6 place-items-center rounded-full text-xs ${pr ? "bg-green text-black" : "border border-white/45"}`}>
          {pr ? <Icon name="check" className="size-3.5" /> : 4}
        </span>
        Ask the team
      </h2>
      {pr ? (
        <p className="mt-2 text-xs text-white/70">
          {`Pull request #${pr.number} is open: ${pr.head} → ${pr.base}. `}
          <a href={pr.url} target="_blank" rel="noreferrer" className="font-medium text-white underline underline-offset-2">
            View on GitHub
          </a>
        </p>
      ) : ready ? (
        <>
          <p className="mt-2 text-xs text-white/65">{`${branch} has ${changedCount} changed ${changedCount === 1 ? "file" : "files"} compared with ${base}. When you're happy, ask the team to add it.`}</p>
          {edits > 0 && <p className="mt-1.5 text-xs text-mustard">Save your notes first: unsaved edits aren&apos;t in the pull request.</p>}
          <input
            value={prTitle}
            onChange={(e) => onPrTitle(e.target.value)}
            placeholder={`Title (Changes from ${branch})`}
            aria-label="Pull request title"
            className="mt-3 w-full rounded-full border border-white/25 bg-white/5 px-3.5 py-1.5 text-sm text-white placeholder:text-white/50"
          />
          <Button variant="glass" onClick={onOpenPr} disabled={busy} className="mt-2 w-full py-2.5">
            {busy ? "Opening…" : "Open pull request"}
          </Button>
        </>
      ) : (
        <p className="mt-2 text-xs text-white/65">
          {branch === base ? `Save to a new branch first. Then you can ask the team to add it to ${base}.` : `Nothing on ${branch} yet: save something first.`}
        </p>
      )}
    </div>
  );
}

// When the page is too narrow for a desk column: the desk docks at the bottom of the page's content (sticky, so it
// never covers the sidebar) as an envelope with the notes on it. Tap to open it and write what you changed.
export function PhoneDock({
  notes,
  open,
  onOpen,
  onOpenFile,
  flying,
  envelope,
  envelopeRef,
}: {
  notes: DeskNote[];
  open: boolean;
  onOpen: (open: boolean) => void;
  onOpenFile: (path: string) => void;
  flying: boolean;
  envelope: ReactNode;
  envelopeRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="sticky bottom-0 z-30 mt-5 pb-[max(0.5rem,env(safe-area-inset-bottom))]" role="region" aria-label="Your desk">
      <div className="mx-auto max-w-xl">
        {open ? (
          <div className="pop max-h-[80vh] overflow-y-auto rounded-3xl shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.8)]">{envelope}</div>
        ) : (
          <div ref={envelopeRef} className="relative rounded-3xl border-[1.5px] border-black bg-paper px-4 pb-4 pt-7 text-black shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.8)]">
            <svg aria-hidden viewBox="0 0 390 26" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-6 w-full">
              <path d="M24 2 L195 24 L366 2" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="flex items-center gap-3">
              <Notes notes={notes} onOpen={onOpenFile} flying={flying} target={envelopeRef} small />
              <button type="button" onClick={() => onOpen(true)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{`${notes.length} changed ${notes.length === 1 ? "file" : "files"}`}</span>
                  <span className="block truncate text-xs text-black/65">{`${notes.map((n) => baseName(n.path)).join(", ")} · not saved yet`}</span>
                </span>
                <Icon name="chevron" className="size-5 shrink-0 rotate-180" />
              </button>
            </div>
            <Button variant="blue" onClick={() => onOpen(true)} className="mt-3 w-full py-2.5">
              Save…
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
