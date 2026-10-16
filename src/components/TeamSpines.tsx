"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import type { Member } from "@/lib/context";
import { agentLabel, groupTeam, type TeamTone } from "@/lib/team";

// The team as a stack of wide colour bars ("spines", PLAN/2026-10-16-glass-buttons-spines.md): one bar per person, in one
// colour, with their agents hanging under it. Tap a bar to read the rest of its COLLAB.md entry. `actions` puts extra
// controls (message, call) beside a bar's own button, never inside it.
export function TeamSpines({ members, actions }: { members: Member[]; actions?: (member: Member, label: string) => ReactNode }) {
  const groups = groupTeam(members);
  if (groups.length === 0) return null;
  return (
    <ul className="space-y-4">
      {groups.map((g, i) => (
        <li key={`${g.person.title}-${i}`} className="rise" style={{ "--d": `${Math.min(i, 8) * 70}ms` } as CSSProperties}>
          <Spine member={g.person} tone={g.tone} actions={actions} />
          {g.agents.length > 0 && (
            <ul className="ml-3 mt-2 space-y-2 border-l-2 border-white/25 pl-2.5 sm:ml-8 sm:pl-4">
              {g.agents.map((a, j) => (
                <li key={`${a.title}-${j}`} className="relative before:absolute before:-left-2.5 before:top-[29px] before:h-0.5 before:w-2.5 before:bg-white/25 sm:before:-left-4 sm:before:w-4">
                  <Spine member={a} tone={g.tone} agent owner={g.person} actions={actions} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function Spine({ member, tone, agent = false, owner, actions }: { member: Member; tone: TeamTone; agent?: boolean; owner?: Member; actions?: (member: Member, label: string) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const panel = `${useId()}-panel`;
  const label = agent ? agentLabel(member, owner) : member.name || member.title;
  const role = member.role || member.title;
  // An agent's long name ("Claude Opus 5.5, Pattadon's agent (runs on …)") is read here instead of on the bar.
  const fields: [string, string][] = [["Role", member.role], ["Can do", member.capability], ["Available", member.availability], ["May write", member.writeScope]];
  const rows = (agent ? [["Name", member.name] as [string, string], ...fields] : fields).filter(([, v]) => v);
  const extra = actions?.(member, label);

  return (
    <div className={`block-${tone}`}>
      <div className={`flex items-center gap-2 ${agent ? "p-1.5" : "p-2 sm:p-2.5"}`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen(!open)}
          className={`flex min-w-0 flex-1 items-center rounded-xl text-left hover:bg-black/5 ${agent ? "gap-2.5 px-1.5 py-1.5 sm:gap-3 sm:px-2" : "gap-3 px-2 py-1.5"}`}
        >
          <Avatar name={agent ? member.title.split("-")[0] || label : label} className={agent ? "size-8 text-sm sm:size-9" : "size-11 text-lg"} />
          <span className="min-w-0 flex-1">
            <span className={`block break-words font-semibold leading-5 ${agent ? "text-sm" : "text-base"}`}>{label}</span>
            <span className="block truncate text-xs leading-4" title={role}>
              {role}
            </span>
          </span>
          <Icon name="chevron" className={`size-5 transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        </button>
        {extra ? <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">{extra}</div> : null}
      </div>

      <div
        id={panel}
        inert={!open}
        className={`grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mx-3 mb-3 border-t border-black/20 sm:mx-4">
            {rows.length === 0 ? (
              <p className="py-3 text-sm">Nothing more is written in COLLAB.md for this entry.</p>
            ) : (
              <dl>
                {rows.map(([k, v]) => (
                  <div key={k} className="border-b border-black/10 py-2.5 last:border-b-0 sm:grid sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-3">
                    <dt className="text-xs font-bold uppercase tracking-wide">{k}</dt>
                    <dd className="mt-0.5 break-words text-sm leading-relaxed sm:mt-0">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
