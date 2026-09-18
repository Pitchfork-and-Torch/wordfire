import { defaultIceServers } from "./p2p";
import { sanitizeIcePayload, type IceServer } from "./turn-filter";

export type IcePayload = {
  iceServers: IceServer[];
  relay: boolean;
};

export async function fetchIceServers(): Promise<IcePayload> {
  try {
    const res = await fetch("/api/ice", { cache: "no-store" });
    if (!res.ok) throw new Error(`ice ${res.status}`);
    const body = (await res.json()) as IcePayload;
    const sanitized = sanitizeIcePayload(body);
    if (sanitized.iceServers.length === 0) {
      return { iceServers: defaultIceServers(), relay: false };
    }
    return sanitized;
  } catch {
    return { iceServers: defaultIceServers(), relay: false };
  }
}
