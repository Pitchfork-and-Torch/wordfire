import { defaultIceServers } from "./p2p";
import type { IceServer } from "./turn-filter";

export type IcePayload = {
  iceServers: IceServer[];
  relay: boolean;
};

export async function fetchIceServers(): Promise<IcePayload> {
  try {
    const res = await fetch("/api/ice", { cache: "no-store" });
    if (!res.ok) throw new Error(`ice ${res.status}`);
    const body = (await res.json()) as IcePayload;
    if (!Array.isArray(body.iceServers) || body.iceServers.length === 0) {
      return { iceServers: defaultIceServers(), relay: false };
    }
    return { iceServers: body.iceServers, relay: Boolean(body.relay) };
  } catch {
    return { iceServers: defaultIceServers(), relay: false };
  }
}
