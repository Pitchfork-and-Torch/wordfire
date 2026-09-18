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
  applyByeMessage,
  applyHelloMessage,
  applyLiveRoster,
  applySkipMessage,
  applyStartMessage,
  applyWordMessage,
  dropSeatedPlayer,
  initialOnlineState,
  isOnlineMessage,
  isStaleGameSeq,
  mergeReaction,
  mergeRoster,
  nextTurn,
  normalizeTurn,
  orderPlayers,
  reconcileHost,
  seatedPlayers,
} from "./online-protocol";
import { useP2PRoom } from "./use-p2p-room";

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
  /** Hang-ups announced on the reliable channel; signaling can lag the bye. */
  const departedRef = useRef<Set<string>>(new Set());
  const stateRef = useRef(state);
  stateRef.current = state;

  const sendRef = useRef(p2p.send);
  sendRef.current = p2p.send;
  const peersRef = useRef(p2p.peers);
  peersRef.current = p2p.peers;

  const liveRemotePeers = useCallback(() => {
    return peersRef.current.filter(
      (p) => !excludedRef.current.has(p.id) && !departedRef.current.has(p.id),
    );
  }, []);

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
      const next = applyLiveRoster(
        {
          ...s,
          players: s.players.filter(
            (p) => !excludedRef.current.has(p.id) && !departedRef.current.has(p.id),
          ),
        },
        {
          selfId,
          selfName: nick,
          hostId: isCreator ? selfId : s.hostId,
          remotePeers: liveRemotePeers(),
          isCreator,
        },
      );
      const same =
        next.players.length === s.players.length &&
        next.players.every(
          (p, i) =>
            p.id === s.players[i]?.id &&
            p.name === s.players[i]?.name &&
            p.colorIndex === s.players[i]?.colorIndex &&
            (p.role ?? "player") === (s.players[i]?.role ?? "player"),
        ) &&
        next.hostId === s.hostId &&
        next.turnPlayerId === s.turnPlayerId;
      return same ? s : next;
    });
  }, [p2p.peers, selfId, nick, isCreator, beenKicked, liveRemotePeers]);

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
        // Snapshot sync is authority-only. Senders are: (1) known room host
        // (startGame broadcasts full_state), (2) global lowest id among self+peers,
        // or (3) lowest remote peer (on-connect push excludes the new joiner from
        // the sender's incumbent set, so a higher-id incumbent may snapshot a
        // brand-new lowest-id joiner). Otherwise any guest can forge
        // { t: "full_state", state: { seq: 99999, words: [], phase: "finished" } }
        // and wipe or rewrite the story.
        const connectedIds = peersRef.current
          .filter((p) => p.connectionState === "connected")
          .map((p) => p.id);
        const incumbentAuth = [...connectedIds].sort()[0];
        const globalAuth = [selfId, ...connectedIds].sort()[0];
        const hostId = stateRef.current.hostId;
        if (from !== incumbentAuth && from !== globalAuth && from !== hostId) return;
        setState((s) => {
          if (
            s.phase !== "lobby" &&
            msg.state.seq < s.seq &&
            msg.state.words.length < s.words.length
          ) {
            return s;
          }
          const blocked = (id: string) =>
            id !== selfId &&
            (excludedRef.current.has(id) || departedRef.current.has(id));
          const preferredHost = isCreator ? selfId : msg.state.hostId || s.hostId;
          const basePlayers =
            msg.state.players.length > 0 ? msg.state.players : s.players;
          const visible = basePlayers.filter((p) => !blocked(p.id));
          const withSelf = visible.some((p) => p.id === selfId)
            ? visible.map((p) =>
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
                ...visible,
                {
                  id: selfId,
                  name: nick,
                  colorIndex: visible.length % 8,
                  role:
                    msg.state.phase === "playing" || msg.state.phase === "finished"
                      ? ("spectator" as const)
                      : ("player" as const),
                },
              ];
          const remotePeers = liveRemotePeers();
          const merged = mergeRoster(
            selfId,
            nick,
            preferredHost,
            remotePeers,
            withSelf,
            msg.state.phase,
          );
          const hostId = reconcileHost(merged, preferredHost);
          const players = orderPlayers(merged, hostId);
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
          const liveIds = new Set(players.map((p) => p.id));
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
            thinking: (useRemote ? remote.thinking : s.thinking).filter((id) =>
              liveIds.has(id),
            ),
            seedId: useRemote ? remote.seedId : s.seedId,
            seedPrompt: useRemote ? remote.seedPrompt : s.seedPrompt,
            seq: Math.max(s.seq, msg.state.seq),
          });
        });
        return;
      }

      if (msg.t === "hello") {
        // Hello seats/renames a peer. Trust the data-channel peer id, not
        // msg.player.id - otherwise any guest can forge
        // { t: "hello", player: { id: victim, name: "Hax", role: "spectator" } }
        // and rename or demote someone still on the live roster.
        if (from !== msg.player.id) return;
        const onRoster = liveRemotePeers().some((p) => p.id === msg.player.id);
        if (onRoster) departedRef.current.delete(msg.player.id);
        else if (msg.player.id !== selfId) departedRef.current.add(msg.player.id);
        setState((s) =>
          applyHelloMessage(s, msg, {
            selfId,
            selfName: nick,
            remotePeers: liveRemotePeers(),
            isCreator,
          }),
        );
        return;
      }

      if (msg.t === "start") {
        // Only the room host may light the fire. Trust the data-channel peer id,
        // not the claimed hostId - otherwise any guest can forge
        // { t: "start", hostId: self, ... } and force-start.
        if (from !== stateRef.current.hostId) return;
        setState((s) =>
          ensureStateShape(
            applyStartMessage(s, msg, {
              selfId,
              selfName: nick,
              remotePeers: liveRemotePeers(),
              isCreator,
            }),
          ),
        );
        return;
      }

      if (msg.t === "word") {
        // Contribution is self-only: trust the data-channel peer id, not word.playerId.
        // Otherwise any guest can forge { t: "word", word: { playerId: victim, ... } }.
        if (from !== msg.word.playerId) return;
        setState((s) => applyWordMessage(s, msg));
        return;
      }

      if (msg.t === "skip") {
        // Skip advances the turn. Trust the data-channel peer against the
        // seated roster - otherwise a mid-game spectator (or any forged peer)
        // can force-skip while the UI only enables Skip for seated players.
        const seat = stateRef.current.players.find((p) => p.id === from);
        if (!seat || (seat.role ?? "player") === "spectator") return;
        setState((s) => applySkipMessage(s, msg));
        return;
      }

      if (msg.t === "undo") {
        setState((s) => {
          if (isStaleGameSeq(msg.seq, s.seq)) return s;
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
        // End-sentence rewrites the shared word list. Trust the data-channel peer
        // against the seated roster - otherwise a mid-game spectator (or any forged
        // peer) can force punctuation while the UI only enables End sentence for
        // seated players.
        const seat = stateRef.current.players.find((p) => p.id === from);
        if (!seat || (seat.role ?? "player") === "spectator") return;
        setState((s) =>
          isStaleGameSeq(msg.seq, s.seq) ? s : { ...s, words: msg.words, seq: msg.seq },
        );
        return;
      }

      if (msg.t === "finish") {
        // Finish ends the story for everyone. Trust the data-channel peer against
        // the seated roster - otherwise a mid-game spectator (or any forged peer)
        // can force-finish while the UI only enables Finish for seated players.
        const seat = stateRef.current.players.find((p) => p.id === from);
        if (!seat || (seat.role ?? "player") === "spectator") return;
        setState((s) =>
          isStaleGameSeq(msg.seq, s.seq)
            ? s
            : {
                ...s,
                phase: "finished",
                words: msg.words,
                pendingTitle: msg.title,
                thinking: [],
                seq: msg.seq,
              },
        );
        return;
      }

      if (msg.t === "react") {
        // Reactions are self-attributed: trust the data-channel peer id, not msg.by.
        // Otherwise any guest can forge { t: "react", by: victim, ... } and spoof chips.
        if (from !== msg.by) return;
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
        // Drafting indicator is self-only: trust the data-channel peer id, not msg.playerId.
        // Otherwise any guest can forge { t: "thinking", playerId: victim, active: true }.
        if (from !== msg.playerId) return;
        setState((s) => {
          const set = new Set(s.thinking ?? []);
          if (msg.active) set.add(msg.playerId);
          else set.delete(msg.playerId);
          return { ...s, thinking: [...set] };
        });
        return;
      }

      if (msg.t === "kick") {
        // Soft-kick is host-attributed: trust the data-channel peer id, not msg.by.
        // Otherwise any guest can forge { t: "kick", by: hostId, playerId: victim }.
        if (from !== msg.by) return;
        if (msg.playerId === selfId) {
          setBeenKicked(true);
        }
        excludedRef.current.add(msg.playerId);
        setState((s) => {
          if (s.hostId !== msg.by && msg.by !== s.hostId) return s;
          return dropSeatedPlayer(s, msg.playerId);
        });
        return;
      }

      if (msg.t === "bye") {
        // Hang-up is self-only: trust the data-channel peer id, not msg.playerId.
        // Otherwise any guest can forge { t: "bye", playerId: victim } and drop seats.
        if (from !== msg.playerId) return;
        if (msg.playerId === selfId) return;
        departedRef.current.add(msg.playerId);
        setState((s) => applyByeMessage(s, msg));
      }
    });
  }, [p2p.onMessage, selfId, nick, isCreator, sendTo, liveRemotePeers]);

  const startGame = useCallback(
    (
      rules: GameRules,
      extras?: { seedId?: string; seedPrompt?: string; seedWords?: StoryWord[] },
    ) => {
      const s = stateRef.current;
      if (s.hostId !== selfId) return false;
      if (seatedPlayers(s.players).length < 2 && s.players.length < 2) return false;

      const hostId = selfId;
      // Everyone still present in lobby becomes a player when the fire lights.
      const players = orderPlayers(
        s.players
          .filter(
            (p) => !excludedRef.current.has(p.id) && !departedRef.current.has(p.id),
          )
          .map((p) => ({ ...p, role: "player" as const })),
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
    const me = s.players.find((p) => p.id === selfId);
    if (!me || (me.role ?? "player") === "spectator") return;
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
  }, [selfId, sendAll]);

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
      setState(dropSeatedPlayer(s, playerId));
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
