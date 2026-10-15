"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { requestCall, type CallSession } from "@/lib/call-session";

// The call lives here, in the app shell, so it keeps going when you open other pages
// (PLAN/2026-10-16-call-stays-on.md). /calls shows the full view through `stage`; other pages show a call bar.
// LiveKit's code loads only once you join (CallRoom is imported on demand, browser only).
const CallRoom = dynamic(() => import("@/components/CallRoom"), { ssr: false });

type CallState = {
  call: CallSession | null;
  joining: boolean;
  error: string | null;
  /** A non-fatal message, e.g. the mic or camera is blocked. */
  note: string | null;
  join: (repo: string) => Promise<void>;
  leave: () => void;
  /** The element on /calls where the full call view is drawn (null when /calls isn't open). */
  stage: HTMLElement | null;
  setStage: (el: HTMLElement | null) => void;
};

const CallContext = createContext<CallState | null>(null);

export function useCall(): CallState {
  const value = useContext(CallContext);
  if (!value) throw new Error("useCall must be used inside CallProvider");
  return value;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [call, setCall] = useState<CallSession | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [stage, setStage] = useState<HTMLElement | null>(null);

  const leave = useCallback(() => {
    // Leaving also closes a popped-out video.
    if (typeof document !== "undefined" && document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    setCall(null);
    setNote(null);
  }, []);

  const join = useCallback(async (repo: string) => {
    setJoining(true);
    setError(null);
    try {
      setCall(await requestCall(repo, (input, init) => fetch(input, init)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the call.");
    } finally {
      setJoining(false);
    }
  }, []);

  const failed = useCallback(
    (message: string) => {
      leave();
      setError(`Couldn't connect to the call server: ${message}`);
    },
    [leave],
  );

  const value = useMemo(
    () => ({ call, joining, error, note, join, leave, stage, setStage }),
    [call, joining, error, note, join, leave, stage],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {call && <CallRoom call={call} stage={stage} onLeave={leave} onError={failed} onNote={setNote} />}
    </CallContext.Provider>
  );
}
