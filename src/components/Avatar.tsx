"use client";

import { useState } from "react";
import { safeAvatar } from "@/lib/profile";

// Figma avatars: a colour block with a black outline and black initials. The colour comes from the name, so a person
// always gets the same one.
const tones = ["bg-pink", "bg-cyan", "bg-mustard", "bg-green"];
const toneFor = (name: string) => tones[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % tones.length];

export function Avatar({ name, url, className = "h-12 w-12" }: { name: string; url?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = safeAvatar(url ?? "");
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black font-semibold text-black ${toneFor(name)} ${className}`}>
      {src && failed !== src ? (
        // Provider/custom avatars are external URLs. Never send the app URL as a referrer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailed(src)} />
      ) : name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
