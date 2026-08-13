/**
 * React binding for P2PRoom. Identity and room id are captured once on mount
 * so re-renders never tear down the mesh.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { P2PRoom, type PeerInfo } from "./p2p";

export interface UseP2PRoomOptions {
  room: string;
  name: string;
  /** Stable id — generated if omitted */
  selfId?: string;
  enabled?: boolean;
}

export interface P2PRoomHandle {
  selfId: string;
  room: string;
  peers: PeerInfo[];
  joined: boolean;
  broadcast: (data: unknown) => void;
  send: (data: unknown, peerId?: string) => void;
  onMessage: (
    fn: (from: string, data: unknown, channel: "state" | "reliable") => void,
  ) => () => void;
}

export function useP2PRoom(options: UseP2PRoomOptions): P2PRoomHandle {
  const [selfId] = useState(
    () => options.selfId ?? `p-${Math.random().toString(36).slice(2, 10)}`,
  );
  const [room] = useState(() => options.room);
  const [name] = useState(() => options.name);
  const enabled = options.enabled !== false;
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState(false);
  const roomRef = useRef<P2PRoom | null>(null);
  const listeners = useRef(
    new Set<(from: string, data: unknown, channel: "state" | "reliable") => void>(),
  );

  useEffect(() => {
    if (!enabled || !room) return;
    const p2p = new P2PRoom({
      room,
      selfId,
      name,
      onPeersChanged: setPeers,
      onMessage: (from, data, channel) => {
        for (const fn of listeners.current) fn(from, data, channel);
      },
      onConnected: () => setJoined(true),
    });
    roomRef.current = p2p;
    void p2p.join();
    return () => {
      roomRef.current = null;
      p2p.close();
      setJoined(false);
      setPeers([]);
    };
  }, [room, selfId, name, enabled]);

  const broadcast = useCallback((data: unknown) => roomRef.current?.broadcast(data), []);
  const send = useCallback(
    (data: unknown, peerId?: string) => roomRef.current?.send(data, peerId),
    [],
  );
  const onMessage = useCallback(
    (fn: (from: string, data: unknown, channel: "state" | "reliable") => void) => {
      listeners.current.add(fn);
      return () => {
        listeners.current.delete(fn);
      };
    },
    [],
  );

  return { selfId, room, peers, joined, broadcast, send, onMessage };
}
