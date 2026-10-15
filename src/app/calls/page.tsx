"use client";

import { useEffect, useState } from "react";
import CallChat from "@/components/CallChat";
import { useCall } from "@/components/CallProvider";
import { Button, Card, PageHeader } from "@/components/ui";
import { pipSupported } from "@/lib/call-session";
import { repos } from "@/lib/mock";

// The team's repo for now, the same one chat uses; one call room per repo.
const repo = repos[0].fullName;

// The call itself lives in the app shell (CallProvider), so it keeps going on other pages.
// This page shows the full view: it hands the shell its stage, and the call is drawn there.
export default function CallsPage() {
  const { call, joining, error, note, join, leave, stage, setStage } = useCall();
  const [canPip, setCanPip] = useState(false);

  // Checked after mount, so the server and browser render the same first frame.
  useEffect(() => setCanPip(pipSupported(document)), []);

  // Floats the first playing video (a shared screen or a camera) in the browser's picture-in-picture window.
  const popOut = () => stage?.querySelector("video")?.requestPictureInPicture().catch(() => {});

  return (
    <div>
      <PageHeader title="Calls" subtitle={`Voice, video and screen sharing for ${call?.repo ?? repo}.`}>
        {call && (
          <div className="flex gap-2">
            {canPip && (
              <Button variant="ghost" onClick={popOut}>
                Pop out
              </Button>
            )}
            <Button variant="ghost" onClick={leave}>
              Leave call
            </Button>
          </div>
        )}
      </PageHeader>

      {call ? (
        <div>
          {note && <p className="mb-2 text-sm text-amber-500">{note}</p>}
          <p className="mb-2 text-xs text-muted">You can open other pages: the call keeps going in a small bar.</p>
          <div className="grid gap-3 lg:grid-cols-[1fr_18rem]">
            {/* Size goes on this wrapper: LiveKit's own CSS sets the room to height 100% and beats Tailwind's layered classes.
                cc-call hides LiveKit's own chat button (globals.css): CallChat beside it is the team's saved chat. */}
            <div ref={setStage} className="cc-call h-[70vh] min-h-[420px] overflow-hidden rounded-lg border border-line" />
            <div className="flex h-72 lg:h-[70vh] lg:min-h-[420px]">
              <CallChat repo={call.repo} />
            </div>
          </div>
        </div>
      ) : (
        <Card className="max-w-xl">
          <p className="mb-4 text-sm text-muted">
            Everyone on the team joins the same room. You start with your mic on and camera off; turn them on or share your screen
            from the bar at the bottom. You can keep using the rest of CoCommit during the call.
          </p>
          <Button onClick={() => join(repo)} disabled={joining}>
            {joining ? "Joining…" : "Join call"}
          </Button>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </Card>
      )}
    </div>
  );
}
