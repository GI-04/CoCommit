"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { repos } from "@/lib/mock";

const CallRoom = dynamic(() => import("@/components/CallRoom"), { ssr: false });

// The team's repo for now, the same one chat uses; one call room per repo.
const repo = repos[0].fullName;

type Joined = { token: string; url: string };

export default function CallsPage() {
  const [joined, setJoined] = useState<Joined | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Joined> & { error?: string };
      if (!res.ok || !data.token || !data.url) throw new Error(data.error ?? "Couldn't join the call.");
      setJoined({ token: data.token, url: data.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the call.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div>
      <PageHeader title="Calls" subtitle={`Voice, video and screen sharing for ${repo}.`}>
        {joined && (
          <Button variant="ghost" onClick={() => setJoined(null)}>
            Leave call
          </Button>
        )}
      </PageHeader>

      {joined ? (
        <CallRoom
          repo={repo}
          url={joined.url}
          token={joined.token}
          onLeave={() => setJoined(null)}
          onError={(message) => {
            setJoined(null);
            setError(`Couldn't connect to the call server: ${message}`);
          }}
        />
      ) : (
        <Card tone="cyan" className="max-w-xl">
          <p className="mb-4 text-sm text-muted">
            Everyone on the team joins the same room. You start with your mic on and camera off; turn them on or share your screen
            from the bar at the bottom.
          </p>
          <Button variant="blue" onClick={join} disabled={joining}>
            {joining ? "Joining…" : "Join call"}
          </Button>
          {error && <p className="mt-3 text-sm font-medium text-removed">{error}</p>}
        </Card>
      )}
    </div>
  );
}
