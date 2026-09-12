import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closeLastWord,
  sanitizeContribution,
  suggestTitle,
  uid,
} from "@/lib/game/engine";
import type { GameRules, StoryWord } from "@/lib/game/types";
import type { PeerInfo } from "./p2p";
import {
  type OnlineCampfireState,
  type OnlineMessage,
  type OnlinePlayer,
  MAX_REMOTE_PLAYERS,
  initialOnlineState,
  isOnlineMessage,
  mergeReaction,
  nextTurn,
  orderPlayers,
  seatedPlayers,
} from "./online-protocol";
import { useP2PRoom } from "./use-p2p-room";

/**
 * Build roster from self + signaling peers. Order is always host-first then id,
 * so every client that shares the same hostId gets the same seating.
 */
function mergeRoster(
  selfId: string,
  selfName: string,
  hostId: string,
  remotePeers: PeerInfo[],
  prev: OnlinePlayer[],
  phase: OnlineCampfireState["phase"],
): OnlinePlayer[] {
  const colorOf = new Map(prev.map((p) => [p.id, p.colorIndex]));
  const roleOf = new Map(prev.map((p) => [p.id, p.role ?? "player"] as const));
  let nextColor = prev.reduce((m, p) => Math.max(m, p.colorIndex + 1), 0);

  const ensureColor = (id: string) => {
    if (colorOf.has(id)) return colorOf.get(id)!;
    const c = nextColor % 8;
    colorOf.set(id, c);
    nextColor++;
    return c;
  };

  const byId = new Map<string, OnlinePlayer>();
  byId.set(selfId, {
    id: selfId,
    name: selfName,
    colorIndex: ensureColor(selfId),
    role: roleOf.get(selfId) ?? "player",
  });

  for (const peer of remotePeers) {
    if (peer.id === selfId) continue;
    if (byId.size >= MAX_REMOTE_PLAYERS) break;
    const prevP = prev.find((p) => p.id === peer.id);
    // Late join mid-play: default spectator unless already seated as player
    let role = prevP?.role ?? roleOf.get(peer.id);
    if (!role) {
      role = phase === "playing" || phase === "finished" ? "spectator" : "player";
    }
    byId.set(peer.id, {
      id: peer.id,
      name: peer.name || prevP?.name || "Guest",
      colorIndex: ensureColor(peer.id),
      role,
    });
  }

  // Keep anyone we already know from game messages even if signaling lags
  for (const p of prev) {
    if (byId.has(p.id) || byId.size >= MAX_REMOTE_PLAYERS) continue;
    byId.set(p.id, {
      ...p,
      colorIndex: ensureColor(p.id),
      role: p.role ?? "player",
    });
  }

  return orderPlayers([...byId.values()], hostId);
}

function normalizeTurn(
  players: OnlinePlayer[],
  turnPlayerId: string,
  turnIndex: number,
): { turnIndex: number; turnPlayerId: string } {
  const circle = seatedPlayers(players);
  if (circle.length === 0) {
    return { turnIndex: 0, turnPlayerId: turnPlayerId || "" };
  }
  if (turnPlayerId) {
    const inCircle = circle.find((p) => p.id === turnPlayerId);
    if (inCircle) {
      const idx = players.findIndex((p) => p.id === turnPlayerId);
      return { turnIndex: idx >= 0 ? idx : 0, turnPlayerId };
    }
  }
  const safeIdx = ((turnIndex % circle.length) + circle.length) % circle.length;
  const pick = circle[safeIdx]!;
  const fullIdx = players.findIndex((p) => p.id === pick.id);
  return {
    turnIndex: fullIdx >= 0 ? fullIdx : safeIdx,
    turnPlayerId: pick.id,
  };
}

function ensureStateShape(s: OnlineCampfireState): OnlineCampfireState {
  return {
    ...s,
    reactions: s.reactions ?? [],
    thinking: s.thinking ?? [],
    rules: {
      ...s.rules,
      noRepeatedWords: s.rules.noRepeatedWords ?? false,
    },
  };
}

export function useOnlineCampfire(opts: {
  code: string;
  nickname: string;
  isCreator: boolean;
}) {
  const p2p = useP2PRoom({
    room: opts.code,
    name: opts.nickname.slice(0, 24) || "Guest",
    enabled: Boolean(opts.code && opts.nickname),
  });

  const selfId = p2p.selfId;
  const nick = opts.nickname.slice(0, 24) || "Guest";
  const isCreator = opts.isCreator;

  // Creator claims host immediately; joiners leave hostId empty until hello/full_state.
  const [state, setState] = useState<OnlineCampfireState>(() =>
    ensureStateShape(
      initialOnlineState(isCreator ? selfId : "", {
        id: selfId,
        name: nick,
        colorIndex: 0,
        role: "player",
      }),
    ),
  );
  const [beenKicked, setBeenKicked] = useState(false);
  /** Host-side: peers soft-kicked (signaling may still list them). */
  const excludedRef = useRef<Set<string>>(new Set());
  const stateRef = useRef(state);
  stateRef.current = state;

  const sendRef = useRef(p2p.send);
  sendRef.current = p2p.send;
  const peersRef = useRef(p2p.peers);
  peersRef.current = p2p.peers;

  const sendAll = useCallback((msg: OnlineMessage) => {
    sendRef.current(msg);
  }, []);

  const sendTo = useCallback((msg: OnlineMessage, peerId: string) => {
    sendRef.current(msg, peerId);
  }, []);

  const isHost = Boolean(state.hostId) && state.hostId === selfId;
  const selfPlayer = state.players.find((p) => p.id === selfId);
  const isSpectator = (selfPlayer?.role ?? "player") === "spectator";

  // Creator always holds host seat
  useEffect(() => {
    if (!isCreator) return;
    setState((s) => (s.hostId === selfId ? s : { ...s, hostId: selfId }));
  }, [isCreator, selfId]);

  // Sync roster from signaling peers - NEVER bump game seq here.
  useEffect(() => {
    if (beenKicked) return;
    setState((s) => {
      const hostId = isCreator ? selfId : s.hostId;
      const peers = p2p.peers.filter((p) => !excludedRef.current.has(p.id));
      const players = mergeRoster(
        selfId,
        nick,
        hostId,
        peers,
        s.players.filter((p) => !excludedRef.current.has(p.id)),
        s.phase,
      );

      const same =
        players.length === s.players.length &&
        players.every(
          (p, i) =>
            p.id === s.players[i]?.id &&
            p.name === s.players[i]?.name &&
            p.colorIndex === s.players[i]?.colorIndex &&
            (p.role ?? "player") === (s.players[i]?.role ?? "player"),
        ) &&
        hostId === s.hostId;
      if (same) return s;

      const turn = normalizeTurn(players, s.turnPlayerId, s.turnIndex);
      return {
        ...s,
        players,
        hostId,
        turnIndex: turn.turnIndex,
        turnPlayerId: turn.turnPlayerId || s.turnPlayerId,
      };
    });
  }, [p2p.peers, selfId, nick, isCreator, beenKicked]);

  // When a peer becomes connected, push full state if we're lowest id
  const prevConnected = useRef<Set<string>>(new Set());
  useEffect(() => {
    const connected = new Set(
      p2p.peers.filter((p) => p.connectionState === "connected").map((p) => p.id),
    );
    const newly = [...connected].filter((id) => !prevConnected.current.has(id));
    prevConnected.current = connected;

    for (const id of newly) {
      const incumbents = [selfId, ...[...connected].filter((x) => x !== id)].sort();
      if (incumbents[0] === selfId) {
        sendTo({ t: "full_state", state: stateRef.current }, id);
      }
      const me = stateRef.current.players.find((p) => p.id === selfId) ?? {
        id: selfId,
        name: nick,
        colorIndex: 0,
        role: "player" as const,
      };
      sendTo({ t: "hello", player: me, wantsHost: isCreator }, id);
    }
  }, [p2p.peers, selfId, nick, isCreator, sendTo]);

  // Announce + request after signaling join
  const announced = useRef(false);
  useEffect(() => {
    if (!p2p.joined || announced.current) return;
    announced.current = true;
    const me = {
      id: selfId,
      name: nick,
      colorIndex: 0,
      role: "player" as const,
    };
    sendAll({ t: "hello", player: me, wantsHost: isCreator });
    sendAll({ t: "request_state" });
  }, [p2p.joined, selfId, nick, isCreator, sendAll]);

  // Message handler
  useEffect(() => {
    return p2p.onMessage((from, data, channel) => {
      if (channel !== "reliable") return;
      if (!isOnlineMessage(data)) return;
      const msg = data;

      if (msg.t === "request_state") {
        const peers = peersRef.current;
        const connectedIds = peers
          .filter((p) => p.connectionState === "connected")
          .map((p) => p.id);
        const incumbents = [selfId, ...connectedIds].sort();
        if (incumbents[0] === selfId) {
          sendTo({ t: "full_state", state: stateRef.current }, from);
        }
        return;
      }

      if (msg.t === "full_state") {
        setState((s) => {
          if (
            s.phase !== "lobby" &&
            msg.state.seq < s.seq &&
            msg.state.words.length < s.words.length
          ) {
            return s;
          }
          const hostId = isCreator ? selfId : msg.state.hostId || s.hostId;
          const basePlayers =
            msg.state.players.length > 0 ? msg.state.players : s.players;
          const withSelf = basePlayers.some((p) => p.id === selfId)
            ? basePlayers.map((p) =>
                p.id === selfId
                  ? {
                      ...p,
                      name: nick,
                      role:
                        p.role ??
                        (msg.state.phase === "playing" || msg.state.phase === "finished"
                          ? "spectator"
                          : "player"),
                    }
                  : p,
              )
            : [
                ...basePlayers,
                {
                  id: selfId,
                  name: nick,
                  colorIndex: basePlayers.length % 8,
                  role:
                    msg.state.phase === "playing" || msg.state.phase === "finished"
                      ? ("spectator" as const)
                      : ("player" as const),
                },
              ];
          const players = orderPlayers(
            mergeRoster(selfId, nick, hostId, peersRef.current, withSelf, msg.state.phase),
            hostId,
          );
          const turn = normalizeTurn(
            players,
            msg.state.turnPlayerId || s.turnPlayerId,
            msg.state.turnIndex,
          );
          const useRemote =
            msg.state.seq >= s.seq ||
            s.phase === "lobby" ||
            msg.state.words.length >= s.words.length;
          const remote = ensureStateShape(msg.state);
          return ensureStateShape({
            ...s,
            ...(useRemote ? remote : {}),
            hostId,
            players,
            turnIndex: turn.turnIndex,
            turnPlayerId: turn.turnPlayerId,
            words: useRemote ? remote.words : s.words,
            phase: useRemote ? remote.phase : s.phase,
            rules: useRemote ? remote.rules : s.rules,
            pendingTitle: useRemote ? remote.pendingTitle : s.pendingTitle,
            reactions: useRemote ? remote.reactions : s.reactions,
            thinking: useRemote ? remote.thinking : s.thinking,
            seedId: useRemote ? remote.seedId : s.seedId,
            seedPrompt: useRemote ? remote.seedPrompt : s.seedPrompt,
            seq: Math.max(s.seq, msg.state.seq),
          });
        });
        return;
      }

      if (msg.t === "hello") {
        setState((s) => {
          let hostId = s.hostId;
          if (isCreator) {
            hostId = selfId;
          } else if (msg.wantsHost) {
            hostId = msg.player.id;
          } else if (!hostId) {
            hostId = msg.player.id;
          }

          let players = s.players.map((p) =>
            p.id === msg.player.id
              ? {
                  ...p,
                  name: msg.player.name,
                  role: msg.player.role ?? p.role,
                }
              : p,
          );
          if (
            !players.some((p) => p.id === msg.player.id) &&
            players.length < MAX_REMOTE_PLAYERS
          ) {
            const role =
              msg.player.role ??
              (s.phase === "playing" || s.phase === "finished"
                ? "spectator"
                : "player");
            players = [
              ...players,
              {
                ...msg.player,
                colorIndex: players.length % 8,
                role,
              },
            ];
          }
          players = orderPlayers(players, hostId);
          const turn = normalizeTurn(players, s.turnPlayerId, s.turnIndex);
          return {
            ...s,
            players,
            hostId,
            turnIndex: turn.turnIndex,
            turnPlayerId: turn.turnPlayerId || s.turnPlayerId,
          };
        });
        return;
      }

      if (msg.t === "start") {
        setState((s) => {
          if (msg.seq < s.seq && s.phase === "playing") return s;
          const hostId = isCreator ? selfId : msg.hostId || s.hostId;
          const seated =
            msg.players?.length > 0
              ? orderPlayers(
                  msg.players.map((p) =>
                    p.id === selfId
                      ? { ...p, name: nick, role: "player" as const }
                      : { ...p, role: p.role ?? "player" },
                  ),
                  hostId,
                )
              : orderPlayers(
                  s.players.map((p) => ({ ...p, role: "player" as const })),
                  hostId,
                );
          const players = seated.some((p) => p.id === selfId)
            ? seated
            : orderPlayers(
                [
                  ...seated,
                  {
                    id: selfId,
                    name: nick,
                    colorIndex: seated.length % 8,
                    role: "player" as const,
                  },
                ],
                hostId,
              );
          const turn = normalizeTurn(
            players,
            msg.turnPlayerId || players[0]?.id || "",
            msg.turnIndex ?? 0,
          );
          return ensureStateShape({
            ...s,
            phase: "playing",
            words: msg.words?.length ? msg.words : [],
            players,
            hostId,
            turnIndex: turn.turnIndex,
            turnPlayerId: turn.turnPlayerId,
            rules: { ...DEFAULT_RULES_SAFE(msg.rules) },
            pendingTitle: "",
            seq: msg.seq,
            seedId: msg.seedId ?? "none",
            seedPrompt: msg.seedPrompt ?? "",
            reactions: [],
            thinking: [],
          });
        });
        return;
      }

      if (msg.t === "word") {
        setState((s) => {
          if (msg.seq < s.seq) return s;
          if (s.words.some((w) => w.id === msg.word.id)) {
            const turn = normalizeTurn(s.players, msg.turnPlayerId, msg.turnIndex);
            return {
              ...s,
              turnIndex: turn.turnIndex,
              turnPlayerId: turn.turnPlayerId,
              thinking: s.thinking.filter((id) => id !== msg.word.playerId),
              seq: Math.max(s.seq, msg.seq),
            };
          }
          const turn = normalizeTurn(s.players, msg.turnPlayerId, msg.turnIndex);
          return {
            ...s,
            phase: "playing",
            words: [...s.words, msg.word],
            turnIndex: turn.turnIndex,
            turnPlayerId: turn.turnPlayerId,
            thinking: s.thinking.filter((id) => id !== msg.word.playerId),
            seq: msg.seq,
          };
        });
        return;
      }

      if (msg.t === "skip") {
        setState((s) => {
          if (msg.seq < s.seq) return s;
          const turn = normalizeTurn(s.players, msg.turnPlayerId, msg.turnIndex);
          return {
            ...s,
            turnIndex: turn.turnIndex,
            turnPlayerId: turn.turnPlayerId,
            seq: msg.seq,
          };
        });
        return;
      }

      if (msg.t === "undo") {
        setState((s) => {
          if (msg.seq < s.seq) return s;
          const turn = normalizeTurn(s.players, msg.turnPlayerId, msg.turnIndex);
          return {
            ...s,
            words: msg.words,
            turnIndex: turn.turnIndex,
            turnPlayerId: turn.turnPlayerId,
            seq: msg.seq,
          };
        });
        return;
      }

      if (msg.t === "end_sentence") {
        setState((s) =>
          msg.seq >= s.seq ? { ...s, words: msg.words, seq: msg.seq } : s,
        );
        return;
      }

      if (msg.t === "finish") {
        setState((s) =>
          msg.seq >= s.seq
            ? {
                ...s,
                phase: "finished",
                words: msg.words,
                pendingTitle: msg.title,
                thinking: [],
                seq: msg.seq,
              }
            : s,
        );
        return;
      }

      if (msg.t === "react") {
        setState((s) => ({
          ...s,
          reactions: mergeReaction(s.reactions ?? [], {
            wordId: msg.wordId,
            emoji: msg.emoji,
            by: msg.by,
          }),
        }));
        return;
      }

      if (msg.t === "thinking") {
        setState((s) => {
          const set = new Set(s.thinking ?? []);
          if (msg.active) set.add(msg.playerId);
          else set.delete(msg.playerId);
          return { ...s, thinking: [...set] };
        });
        return;
      }

      if (msg.t === "kick") {
        if (msg.playerId === selfId) {
          setBeenKicked(true);
        }
        excludedRef.current.add(msg.playerId);
        setState((s) => {
          if (s.hostId !== msg.by && msg.by !== s.hostId) return s;
          const players = orderPlayers(
            s.players.filter((p) => p.id !== msg.playerId),
            s.hostId,
          );
          const turn = normalizeTurn(players, s.turnPlayerId, s.turnIndex);
          return {
            ...s,
            players,
            turnIndex: turn.turnIndex,
            turnPlayerId: turn.turnPlayerId,
            thinking: (s.thinking ?? []).filter((id) => id !== msg.playerId),
          };
        });
      }
    });
  }, [p2p.onMessage, selfId, nick, isCreator, sendTo]);

  const startGame = useCallback(
    (
      rules: GameRules,
      extras?: { seedId?: string; seedPrompt?: string; seedWords?: StoryWord[] },
    ) => {
      const s = stateRef.current;
      if (s.hostId !== selfId) return false;
      if (seatedPlayers(s.players).length < 2 && s.players.length < 2) return false;

      const hostId = selfId;
      // Everyone in lobby becomes player when fire lights
      const players = orderPlayers(
        s.players.map((p) => ({ ...p, role: "player" as const })),
        hostId,
      );
      if (players.length < 2) return false;
      const turnIndex = 0;
      const turnPlayerId = seatedPlayers(players)[0]!.id;
      const seq = s.seq + 1;
      const words = extras?.seedWords ?? [];
      const next: OnlineCampfireState = ensureStateShape({
        ...s,
        hostId,
        phase: "playing",
        words,
        players,
        turnIndex,
        turnPlayerId,
        rules: { ...rules, noRepeatedWords: rules.noRepeatedWords ?? false },
        pendingTitle: "",
        seq,
        seedId: extras?.seedId ?? "none",
        seedPrompt: extras?.seedPrompt ?? "",
        reactions: [],
        thinking: [],
      });
      setState(next);
      sendAll({
        t: "start",
        rules: next.rules,
        players,
        hostId,
        turnIndex,
        turnPlayerId,
        seq,
        seedId: next.seedId,
        seedPrompt: next.seedPrompt,
        words,
      });
      sendAll({ t: "full_state", state: next });
      return true;
    },
    [selfId, sendAll],
  );

  const currentPlayer =
    state.players.find((p) => p.id === state.turnPlayerId) ??
    state.players[state.turnIndex % Math.max(state.players.length, 1)];

  const isMyTurn =
    state.phase === "playing" &&
    !isSpectator &&
    Boolean(state.turnPlayerId) &&
    state.turnPlayerId === selfId;

  const addWord = useCallback(
    (raw: string): { ok: true } | { ok: false; reason: string } => {
      const s = stateRef.current;
      if (s.phase !== "playing") return { ok: false, reason: "Not playing yet." };
      const me = s.players.find((p) => p.id === selfId);
      if ((me?.role ?? "player") === "spectator") {
        return { ok: false, reason: "Spectators watch this circle." };
      }

      const turn = normalizeTurn(s.players, s.turnPlayerId, s.turnIndex);
      if (!turn.turnPlayerId || turn.turnPlayerId !== selfId) {
        return { ok: false, reason: "Wait for your turn." };
      }
      const cur = s.players.find((p) => p.id === selfId) ?? s.players[turn.turnIndex];
      if (!cur) return { ok: false, reason: "You are not in the circle." };

      const result = sanitizeContribution(raw, s.rules, s.words);
      if (!result.ok) return result;

      const word: StoryWord = {
        id: uid("w"),
        text: result.text,
        playerId: cur.id,
        playerName: cur.name,
        colorIndex: cur.colorIndex,
        endsSentence: result.endsSentence,
        createdAt: Date.now(),
      };

      const advanced = nextTurn(s.players, cur.id);
      const seq = s.seq + 1;
      const nextState: OnlineCampfireState = {
        ...s,
        words: [...s.words, word],
        turnIndex: advanced.turnIndex,
        turnPlayerId: advanced.turnPlayerId,
        thinking: (s.thinking ?? []).filter((id) => id !== selfId),
        seq,
      };
      setState(nextState);
      sendAll({
        t: "word",
        word,
        turnIndex: advanced.turnIndex,
        turnPlayerId: advanced.turnPlayerId,
        seq,
      });
      sendAll({ t: "thinking", playerId: selfId, active: false });
      return { ok: true };
    },
    [selfId, sendAll],
  );

  const skipTurn = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "playing" || s.players.length === 0) return;
    const fromId =
      s.turnPlayerId || s.players[s.turnIndex % s.players.length]?.id;
    if (!fromId) return;
    const advanced = nextTurn(s.players, fromId);
    const seq = s.seq + 1;
    setState({
      ...s,
      turnIndex: advanced.turnIndex,
      turnPlayerId: advanced.turnPlayerId,
      seq,
    });
    sendAll({
      t: "skip",
      turnIndex: advanced.turnIndex,
      turnPlayerId: advanced.turnPlayerId,
      seq,
    });
  }, [sendAll]);

  const undoLast = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "playing" || s.words.length === 0) return;
    const last = s.words[s.words.length - 1]!;
    if (last.playerId !== selfId && s.hostId !== selfId) return;
    if (last.playerId === "seed") return;
    const words = s.words.slice(0, -1);
    const authorIdx = s.players.findIndex((p) => p.id === last.playerId);
    const turnIndex =
      authorIdx >= 0
        ? authorIdx
        : (s.turnIndex - 1 + s.players.length) % Math.max(s.players.length, 1);
    const turnPlayerId =
      authorIdx >= 0 ? last.playerId : s.players[turnIndex]?.id || last.playerId;
    const seq = s.seq + 1;
    setState({ ...s, words, turnIndex, turnPlayerId, seq });
    sendAll({ t: "undo", words, turnIndex, turnPlayerId, seq });
  }, [selfId, sendAll]);

  const endSentence = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "playing" || s.words.length === 0) return;
    const words = closeLastWord(s.words);
    const seq = s.seq + 1;
    setState({ ...s, words, seq });
    sendAll({ t: "end_sentence", words, seq });
  }, [sendAll]);

  const finishStory = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "playing" || s.words.length === 0) return;
    const words = closeLastWord(s.words);
    const title = suggestTitle(words);
    const seq = s.seq + 1;
    setState({
      ...s,
      words,
      phase: "finished",
      pendingTitle: title,
      thinking: [],
      seq,
    });
    sendAll({ t: "finish", title, words, seq });
  }, [sendAll]);

  const setTitle = useCallback((title: string) => {
    setState((s) => ({ ...s, pendingTitle: title.slice(0, 80) }));
  }, []);

  const setThinking = useCallback(
    (active: boolean) => {
      const s = stateRef.current;
      if (s.phase !== "playing") return;
      if (s.turnPlayerId !== selfId) return;
      setState((prev) => {
        const set = new Set(prev.thinking ?? []);
        if (active) set.add(selfId);
        else set.delete(selfId);
        return { ...prev, thinking: [...set] };
      });
      sendAll({ t: "thinking", playerId: selfId, active });
    },
    [selfId, sendAll],
  );

  const reactToWord = useCallback(
    (wordId: string, emoji: string) => {
      const by = selfId;
      setState((s) => ({
        ...s,
        reactions: mergeReaction(s.reactions ?? [], { wordId, emoji, by }),
      }));
      sendAll({ t: "react", wordId, emoji, by });
    },
    [selfId, sendAll],
  );

  const kickPlayer = useCallback(
    (playerId: string) => {
      const s = stateRef.current;
      if (s.hostId !== selfId) return;
      if (playerId === selfId) return;
      excludedRef.current.add(playerId);
      const players = orderPlayers(
        s.players.filter((p) => p.id !== playerId),
        s.hostId,
      );
      const turn = normalizeTurn(players, s.turnPlayerId, s.turnIndex);
      setState({
        ...s,
        players,
        turnIndex: turn.turnIndex,
        turnPlayerId: turn.turnPlayerId,
        thinking: (s.thinking ?? []).filter((id) => id !== playerId),
      });
      sendAll({ t: "kick", playerId, by: selfId });
    },
    [selfId, sendAll],
  );

  const connectionIssues = useMemo(
    () => p2p.peers.filter((p) => p.terminal === true),
    [p2p.peers],
  );

  const throughTheWall = useMemo(
    () =>
      p2p.peers.some(
        (p) => p.connectionState === "connected" && p.candidateType === "relay",
      ),
    [p2p.peers],
  );

  const connectedCount = useMemo(
    () => 1 + p2p.peers.filter((p) => p.connectionState === "connected").length,
    [p2p.peers],
  );

  const rosterCount = 1 + p2p.peers.length;

  return {
    selfId,
    code: opts.code,
    joined: p2p.joined,
    peers: p2p.peers as PeerInfo[],
    state: ensureStateShape(state),
    isHost,
    isMyTurn,
    isSpectator,
    kicked: beenKicked,
    currentPlayer,
    connectedCount,
    rosterCount,
    connectionIssues,
    throughTheWall,
    startGame,
    addWord,
    skipTurn,
    undoLast,
    endSentence,
    finishStory,
    setTitle,
    setThinking,
    reactToWord,
    kickPlayer,
  };
}

function DEFAULT_RULES_SAFE(rules: GameRules): GameRules {
  return {
    ...rules,
    noRepeatedWords: rules.noRepeatedWords ?? false,
  };
}
