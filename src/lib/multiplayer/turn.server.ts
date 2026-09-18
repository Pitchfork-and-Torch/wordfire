/**
 * Mint short-lived Cloudflare Realtime TURN credentials.
 * Long-term TURN_KEY_* stay server-side. Missing env falls back to STUN.
 */
import {
  FALLBACK_STUN,
  iceHasTurn,
  stripBrowserBlockedTurnUrls,
  type IceServer,
} from "./turn-filter";

export const TURN_TTL_SECONDS = 14_400;

export type IcePayload = {
  iceServers: IceServer[];
  relay: boolean;
};

function env(name: string): string {
  const v =
    typeof process !== "undefined" ? process.env[name]?.trim() : undefined;
  return v ?? "";
}

export function stunOnlyIce(): IcePayload {
  return { iceServers: FALLBACK_STUN, relay: false };
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function mintIceServers(
  fetchImpl: FetchLike = fetch,
): Promise<IcePayload> {
  const keyId = env("TURN_KEY_ID");
  const token = env("TURN_KEY_API_TOKEN");
  if (!keyId || !token) return stunOnlyIce();

  const url = `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
  });
  if (!res.ok) {
    console.error("[ice] TURN mint failed", res.status);
    return stunOnlyIce();
  }
  const body = (await res.json()) as { iceServers?: IceServer[] };
  const filtered = stripBrowserBlockedTurnUrls(body.iceServers ?? []);
  if (!iceHasTurn(filtered)) return stunOnlyIce();
  return { iceServers: filtered, relay: true };
}
