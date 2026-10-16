"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

// Goes back one page; with no history to go back to (a page opened directly) it goes to the app home.
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/home"))}
      aria-label="Go back"
      title="Back"
      className="glass grid size-10 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
    >
      <Icon name="back" className="size-4" />
    </button>
  );
}
