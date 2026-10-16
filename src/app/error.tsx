"use client";

import Link from "next/link";
import { useEffect } from "react";

// Something broke while drawing a page: say so, offer to try again, and keep the navigation usable.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="block-clay mx-auto mt-6 max-w-md p-8 text-center">
      <h1 className="text-[32px] font-semibold leading-tight">Something went wrong</h1>
      <p className="mt-2 text-sm">This page hit a problem. Your work in other screens is safe. Try again, or go back to Home.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90">
          Try again
        </button>
        <Link href="/home" className="rounded-xl border border-black bg-paper px-5 py-3 text-sm font-medium hover:opacity-90">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
