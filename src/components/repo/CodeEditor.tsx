"use client";

import { useDeferredValue, useMemo, useRef, type RefObject } from "react";
import { lineChanges } from "@/lib/desk";

const LINE = 24; // px, matches leading-6
const PAD = 12; // px, the textarea's top padding

// The Repository editor: a plain textarea (so typing, undo and paste behave as everywhere else) over a layer that marks the
// lines you changed since the last save in green, with line numbers in a gutter. Lines never wrap; the gutter and the marks
// follow the textarea's scroll.
export function CodeEditor({
  value,
  original,
  onChange,
  label,
  editorRef,
}: {
  value: string;
  original: string;
  onChange: (text: string) => void;
  label: string;
  editorRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const deferred = useDeferredValue(value);
  const marks = useMemo(() => new Set(lineChanges(original, deferred).marks), [original, deferred]);
  const count = Math.max(1, value.split("\n").length);

  return (
    <div ref={box} className="relative flex h-[min(68vh,42rem)] min-h-[18rem] overflow-hidden bg-black/30 font-mono text-[13px] leading-6 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-accent-soft">
      <div aria-hidden className="relative w-12 shrink-0 overflow-hidden border-r border-white/10 text-right text-muted">
        <div className="code-gutter" style={{ paddingTop: PAD }}>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className={`relative pr-2 ${marks.has(i + 1) ? "text-added" : ""}`} style={{ height: LINE }}>
              {marks.has(i + 1) && <span className="absolute inset-y-0 left-0 w-[3px] bg-added" />}
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        <div aria-hidden className="code-marks pointer-events-none absolute inset-x-0 top-0">
          {[...marks].map((n) => (
            <div key={n} className="absolute inset-x-0 bg-added/15" style={{ top: PAD + (n - 1) * LINE, height: LINE }} />
          ))}
        </div>
        <textarea
          ref={editorRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => box.current?.style.setProperty("--sy", `${e.currentTarget.scrollTop}px`)}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={label}
          className="relative block size-full resize-none bg-transparent px-4 text-white caret-white outline-none [tab-size:2]"
          style={{ paddingTop: PAD, paddingBottom: PAD }}
        />
      </div>
    </div>
  );
}
