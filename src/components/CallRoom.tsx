"use client";

import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { useState } from "react";

const DEVICE_BLOCKED = "Your microphone or camera is blocked, so you're listening only. Allow it in the browser, then use the buttons below.";

// LiveKit's ready-made call screen: video tiles, mic, camera, screen share, chat and Leave.
// Loaded only in the browser (see src/app/calls/page.tsx), because WebRTC needs window.
export default function CallRoom({
  url,
  token,
  onLeave,
  onError,
}: {
  url: string;
  token: string;
  onLeave: () => void;
  onError: (message: string) => void;
}) {
  const [note, setNote] = useState<string | null>(null);

  return (
    <div>
      {note && <p className="mb-2 text-sm text-amber-500">{note}</p>}
      {/* Size goes on this wrapper: LiveKit's own CSS sets the room to height 100% and beats Tailwind's layered classes. */}
      <div className="h-[70vh] min-h-[420px] overflow-hidden rounded-lg border border-line">
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
    </div>
  );
}
