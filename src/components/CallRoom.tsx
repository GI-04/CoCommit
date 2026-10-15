"use client";

import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { useState } from "react";
import CallChat from "@/components/CallChat";

const DEVICE_BLOCKED = "Your microphone or camera is blocked, so you're listening only. Allow it in the browser, then use the buttons below.";

// LiveKit's ready-made call screen: video tiles, mic, camera, screen share, chat and Leave.
// Loaded only in the browser (see src/app/calls/page.tsx), because WebRTC needs window.
export default function CallRoom({
  repo,
  url,
  token,
  onLeave,
  onError,
}: {
  repo: string;
  url: string;
  token: string;
  onLeave: () => void;
  onError: (message: string) => void;
}) {
  const [note, setNote] = useState<string | null>(null);

  return (
    <div>
      {note && <p className="mb-2 text-sm text-amber-500">{note}</p>}
      <div className="grid gap-3 lg:grid-cols-[1fr_18rem]">
        {/* Size goes on this wrapper: LiveKit's own CSS sets the room to height 100% and beats Tailwind's layered classes.
            cc-call hides LiveKit's own chat button (globals.css): CallChat beside it is the team's saved chat. */}
        <div className="cc-call h-[70vh] min-h-[420px] overflow-hidden rounded-lg border border-line">
          <LiveKitRoom
            serverUrl={url}
            token={token}
            connect
            audio
            video={false}
            onDisconnected={onLeave}
            // LiveKit reports a refused mic/camera here too: that's not a reason to leave the call.
            onError={(e) => {
              if (e.name !== "ConnectionError") setNote(DEVICE_BLOCKED);
              else if (!/client initiated disconnect/i.test(e.message)) onError(e.message);
            }}
            onMediaDeviceFailure={() => setNote(DEVICE_BLOCKED)}
            data-lk-theme="default"
          >
            <VideoConference />
          </LiveKitRoom>
        </div>
        <div className="flex h-72 lg:h-[70vh] lg:min-h-[420px]">
          <CallChat repo={repo} />
        </div>
      </div>
    </div>
  );
}
