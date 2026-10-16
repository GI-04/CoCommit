"use client";

import { useMemo } from "react";
import { parsePatch, type DiffLine } from "@/lib/diff";

const ROW: Record<DiffLine["kind"], string> = {
  add: "bg-added/20",
  del: "bg-removed/20",
  hunk: "bg-white/5 text-muted",
  meta: "text-muted",
  ctx: "",
};
const SIGN: Partial<Record<DiffLine["kind"], string>> = { add: "+", del: "−" };

// The Figma diff: old and new line numbers, a +/− column, green and red rows. Used by the Repository page (web and
// local folder). Lines never wrap; the panel scrolls sideways instead.
export function DiffView({ patch, empty = "(no text changes to show)" }: { patch: string; empty?: string }) {
  const rows = useMemo(() => parsePatch(patch), [patch]);
  if (!rows.length) return <p className="p-5 text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-auto font-mono text-[13px] leading-6" role="group" aria-label="Changes in this file">
      <div className="min-w-max">
        {rows.map((r, i) => (
          <div key={i} className={`grid grid-cols-[3rem_3rem_1.25rem_1fr] ${ROW[r.kind]} ${r.kind === "add" ? "border-l-[3px] border-added" : r.kind === "del" ? "border-l-[3px] border-removed" : "border-l-[3px] border-transparent"}`}>
            {r.kind === "hunk" || r.kind === "meta" ? (
              <span className="col-span-4 whitespace-pre px-3">{r.text || " "}</span>
            ) : (
              <>
                <span className="select-none pr-2 text-right text-muted">{r.oldNo ?? ""}</span>
                <span className="select-none pr-2 text-right text-muted">{r.newNo ?? ""}</span>
                <span className={`select-none text-center ${r.kind === "add" ? "text-added" : "text-removed"}`}>{SIGN[r.kind] ?? ""}</span>
                <span className="whitespace-pre pr-4">{r.text || " "}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
