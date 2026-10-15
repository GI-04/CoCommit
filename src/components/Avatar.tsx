"use client";

import { useState } from "react";
import { safeAvatar } from "@/lib/profile";

export function Avatar({ name, url, className = "h-12 w-12" }: { name: string; url?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = safeAvatar(url ?? "");
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 font-semibold text-accent ${className}`}>
      {src && failed !== src ? (
        // Provider/custom avatars are external URLs. Never send the app URL as a referrer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailed(src)} />
      ) : name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
