import Link from "next/link";
import { signInHref } from "@/lib/github-client";
import { problem, type Load } from "./data";

// Why a card has no data, with the next step: log in, or set up the team context.
export function Trouble({ state, from }: { state: Load<unknown>; from: string }) {
  const text = problem(state);
  if (!text) return null;
  return (
    <p className="text-sm">
      {text}{" "}
      {state.status === "login" && (
        <Link href={signInHref(from)} className="font-medium underline">
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
