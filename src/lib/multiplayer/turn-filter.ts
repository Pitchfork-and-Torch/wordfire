/**
 * ICE URL hygiene for browsers. Cloudflare returns alternate port 53 TURN
 * URLs that time out in Chrome/Firefox; trickle ICE then stalls gathering.
 */

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export const FALLBACK_STUN: IceServer[] = [
  {
    urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"],
  },
];

function urlIsBrowserBlocked(url: string): boolean {
  try {
    const u = url.replace(/^turns?:/i, "https:").replace(/^stuns?:/i, "https:");
    const parsed = new URL(u);
    return parsed.port === "53";
  } catch {
    return /:53(?:\?|$)/.test(url);
  }
}

export function stripBrowserBlockedTurnUrls(servers: IceServer[]): IceServer[] {
  const out: IceServer[] = [];
  for (const s of servers) {
    const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(
      (url) => typeof url === "string" && !urlIsBrowserBlocked(url),
    );
    if (urls.length === 0) continue;
    out.push({
      ...s,
      urls: Array.isArray(s.urls) ? urls : urls[0],
    });
  }
  return out;
}

export function iceHasTurn(servers: IceServer[]): boolean {
  return servers.some((s) =>
    (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) =>
      /^turns?:/i.test(u),
    ),
  );
}

/** Last-mile ICE hygiene. Mint already strips; the client must too. */
export function sanitizeIcePayload(input: {
  iceServers?: IceServer[] | null;
  relay?: boolean;
}): { iceServers: IceServer[]; relay: boolean } {
  const iceServers = stripBrowserBlockedTurnUrls(
    Array.isArray(input.iceServers) ? input.iceServers : [],
  );
  return {
    iceServers,
    relay: Boolean(input.relay) && iceHasTurn(iceServers),
  };
}

/**
 * Perfect-negotiation: ICE from an ignored colliding offer must not be
 * buffered or applied onto the in-flight local offer.
 */
export type IceDisposition = "drop" | "buffer" | "apply";

export function iceCandidateDisposition(
  ignoreOffer: boolean,
  hasRemoteDescription: boolean,
): IceDisposition {
  if (ignoreOffer) return "drop";
  if (!hasRemoteDescription) return "buffer";
  return "apply";
}
