// The commit-graph rail down the left of the landing page: each section is a commit on main,
// and <Branch> forks a green feature branch off main and merges it back.
// Lanes sit at 25% (main) and 75% (branch) of the rail column.

const grid = "grid grid-cols-[2.25rem_minmax(0,1fr)] md:grid-cols-[4rem_minmax(0,1fr)]";
const mainLine = "absolute left-1/4 w-0.5 -translate-x-1/2 bg-accent/30";

type NodeKind = "commit" | "head" | "merge";

function Node({ kind, className }: { kind: NodeKind; className: string }) {
  const shape =
    kind === "head"
      ? "size-4 bg-accent ring-[6px] ring-accent/20"
      : kind === "merge"
        ? "size-5 border-[5px] border-accent bg-bg ring-[6px] ring-accent/15"
        : "size-3.5 border-2 border-accent bg-bg";
  return <span className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${shape} ${className}`} />;
}

type CommitProps = {
  children: React.ReactNode;
  id?: string;
  node?: NodeKind;
  /** Font-size classes matching the section's first heading, so the node lines up with it. */
  size?: string;
  first?: boolean;
  last?: boolean;
  label?: string;
};

export function Commit({ children, id, node = "commit", size = "text-3xl md:text-5xl", first, last, label }: CommitProps) {
  return (
    <section id={id} aria-label={label} className={`${grid} scroll-mt-20`}>
      <div aria-hidden className={`relative ${size}`}>
        <span className={`${mainLine} ${first ? "top-[0.55em]" : "top-0"} ${last ? "h-[0.55em]" : "bottom-0"}`} />
        <Node kind={node} className="left-1/4 top-[0.55em]" />
      </div>
      <div className={last ? "" : "pb-24 md:pb-36"}>{children}</div>
    </section>
  );
}

function Curve({ d, className }: { d: string; className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 4 4" preserveAspectRatio="none" className={`absolute inset-x-0 h-16 w-full text-added ${className}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Branch({ children, id, label }: { children: React.ReactNode; id?: string; label?: string }) {
  return (
    <section id={id} aria-label={label} className={`${grid} scroll-mt-20`}>
      <div aria-hidden className="relative text-3xl md:text-5xl">
        <span className={`${mainLine} inset-y-0`} />
        <Curve d="M1 0 C1 2.6 3 1.4 3 4" className="top-0" />
        <span className="absolute inset-y-16 left-3/4 w-0.5 -translate-x-1/2 bg-added/60" />
        <Curve d="M3 0 C3 2.6 1 1.4 1 4" className="bottom-0" />
        <span className="absolute left-3/4 top-[calc(4rem+0.55em)] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-added bg-bg" />
      </div>
      <div className="pl-3 pt-16 pb-36 md:pl-6 md:pb-44">{children}</div>
    </section>
  );
}
