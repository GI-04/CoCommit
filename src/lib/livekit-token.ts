import { createHmac } from "node:crypto";

// LiveKit access tokens (server only). A token is a JWT signed with the API secret (HS256),
// so Node's crypto is enough and we don't need livekit-server-sdk.
// Format: https://docs.livekit.io/home/get-started/authentication/

export type LiveKitKeys = { url: string; apiKey: string; apiSecret: string };

/** The LiveKit keys from the environment, or null while calls aren't set up. */
export function liveKitKeys(env: Record<string, string | undefined> = process.env): LiveKitKeys | null {
  const url = env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = env.LIVEKIT_API_KEY;
  const apiSecret = env.LIVEKIT_API_SECRET;
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

/**
 * One call room per repo, named by GitHub's numeric repo id: 123 → "cocommit-repo-123". Names made from "owner/name"
 * could collide ("acme/my-app" and "acme-my/app") and changed on a rename; an id does neither
 * (PLAN/2026-10-19-security-fixes.md, item 3). Null if it isn't an id.
 */
export function roomForRepo(repoId: unknown): string | null {
  return typeof repoId === "number" && Number.isSafeInteger(repoId) && repoId > 0 ? `cocommit-repo-${repoId}` : null;
}

const base64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

/** A token that lets `identity` (shown as `name`) join `room` with camera, mic and screen share. */
export function createToken(
  keys: Pick<LiveKitKeys, "apiKey" | "apiSecret">,
  who: { identity: string; name: string },
  room: string,
  ttlSeconds = 6 * 60 * 60,
  now = Date.now(),
): string {
  const iat = Math.floor(now / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: keys.apiKey,
    sub: who.identity,
    name: who.name,
    nbf: iat,
    iat,
    exp: iat + ttlSeconds,
    video: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true },
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createHmac("sha256", keys.apiSecret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}
