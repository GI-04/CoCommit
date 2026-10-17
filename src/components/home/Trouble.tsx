import Link from "next/link";
import { Pill } from "@/components/ui";
import { problem, type Load } from "./data";

/** The login page with every way to log in (GitHub, Google, email), coming back to `from` afterwards. */
export const logInHref = (from: string) => `/login?returnTo=${encodeURIComponent(from)}`;

// Why a card has no data, with the next step: log in, or set up the team context.
export function Trouble({ state, from }: { state: Load<unknown>; from: string }) {
  const text = problem(state);
  if (!text) return null;
  return (
    <p className="text-sm">
      {text}{" "}
      {state.status === "login" && (
        <Link href={logInHref(from)} className="font-medium underline">
          Log in
        </Link>
      )}
      {state.status === "no-workspace" && (
        <Link href="/context" className="font-medium underline">
          Set up team context
        </Link>
      )}
    </p>
  );
}

/** "Demo" next to a card's title while the card shows made-up data (signed out). */
export function DemoTag({ state }: { state: Load<unknown> }) {
  return state.status === "ready" && state.demo ? <Pill className="font-semibold">Demo</Pill> : null;
}

/** A card title with the Demo tag after it. */
export function DemoTitle({ text, state }: { text: string; state: Load<unknown> }) {
  return (
    <span className="flex items-center gap-2">
      {text}
      <DemoTag state={state} />
    </span>
  );
}
