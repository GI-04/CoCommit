"use client";

import "@livekit/components-styles";
import {
  DisconnectButton,
  LiveKitRoom,
  RoomAudioRenderer,
  TrackToggle,
  VideoConference,
  VideoTrack,
  isTrackReference,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { pipSupported, showCallBar, type CallSession } from "@/lib/call-session";

const DEVICE_BLOCKED = "Your microphone or camera is blocked, so you're listening only. Allow it in the browser, then use the buttons below.";

// The one LiveKit room, kept in the app shell by CallProvider while you're in a call (browser only: WebRTC needs window).
// On /calls the full view (video tiles, mic, camera, screen share, Leave) is drawn into the page's stage;
// on other pages a small call bar keeps you talking.
export default function CallRoom({
  call,
  stage,
  onLeave,
  onError,
  onNote,
}: {
  call: CallSession;
  stage: HTMLElement | null;
  onLeave: () => void;
  onError: (message: string) => void;
  onNote: (message: string | null) => void;
}) {
  const bar = showCallBar(usePathname(), true);

  return (
    <LiveKitRoom
      serverUrl={call.url}
      token={call.token}
      connect
      audio
      video={false}
      onDisconnected={onLeave}
      // LiveKit reports a refused mic/camera here too: that's not a reason to leave the call.
      onError={(e) => {
        if (e.name !== "ConnectionError") onNote(DEVICE_BLOCKED);
        else if (!/client initiated disconnect/i.test(e.message)) onError(e.message);
      }}
      onMediaDeviceFailure={() => onNote(DEVICE_BLOCKED)}
      data-lk-theme="default"
      // The room's own box takes no space: the full view goes into the stage, the bar is fixed on screen.
      style={{ display: "contents" }}
    >
      {!bar && stage ? (
        // VideoConference plays the audio itself, so only one audio renderer is ever mounted.
        createPortal(
          <div className="h-full" data-lk-theme="default">
            <VideoConference />
          </div>,
          stage,
        )
      ) : (
        <>
          <RoomAudioRenderer />
          {bar && <CallBar repo={call.repo} />}
        </>
      )}
    </LiveKitRoom>
  );
}

// Bottom-right on every page but /calls: who's on video, mic and camera, pop out, back to the call, leave.
function CallBar({ repo }: { repo: string }) {
  const thumb = useRef<HTMLDivElement>(null);
  const video = useTracks([Track.Source.ScreenShare, Track.Source.Camera], { onlySubscribed: false }).find(
    (t) => isTrackReference(t) && !t.publication.isMuted,
  );

  const popOut = () => thumb.current?.querySelector("video")?.requestPictureInPicture().catch(() => {});

  return (
    <div
      role="region"
      aria-label="Call"
      className="fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2 rounded-lg border border-line bg-surface p-3 text-sm shadow-lg"
    >
      <p className="font-medium">
        In call · <span className="text-muted">{repo}</span>
      </p>
      {video && isTrackReference(video) && (
        <div ref={thumb} className="overflow-hidden rounded-md bg-black">
          <VideoTrack trackRef={video} className="h-32 w-full object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <TrackToggle source={Track.Source.Microphone} showIcon className="lk-button" />
        <TrackToggle source={Track.Source.Camera} showIcon className="lk-button" />
        {video && typeof document !== "undefined" && pipSupported(document) && (
          <button onClick={popOut} className="lk-button">
            Pop out
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Link href="/calls" className="underline">
          Back to call
        </Link>
        <DisconnectButton className="lk-disconnect-button">Leave</DisconnectButton>
      </div>
    </div>
  );
}
