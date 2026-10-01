import type { GameRules, StoryWord } from "@/lib/game/types";
import { DEFAULT_RULES } from "@/lib/game/types";

/** Comfortable mesh size; degrade gracefully beyond ~8. */
export const MAX_REMOTE_PLAYERS = 12;

export type OnlineRole = "player" | "spectator";

export interface OnlinePlayer {
  id: string;
  name: string;
  colorIndex: number;
  role?: OnlineRole;
}

export type OnlinePhase = "lobby" | "playing" | "finished";

export interface WordReaction {
  wordId: string;
  emoji: string;
  by: string;
}

export interface OnlineCampfireState {
  hostId: string;
  phase: OnlinePhase;
  players: OnlinePlayer[];
  words: StoryWord[];
  /** Index into `players` for UI; may lag if roster reorders - prefer turnPlayerId. */
  turnIndex: number;
  /** Authoritative peer id whose contribution is accepted next. */
  turnPlayerId: string;
  rules: GameRules;
  pendingTitle: string;
  /** Monotonic game-event counter (start/word/skip/undo/end/finish only). */
  seq: number;
  /** Optional seed catalog id */
  seedId?: string;
  seedPrompt?: string;
  /** Soft reactions (do not bump seq on every pulse - applied as merge) */
  reactions: WordReaction[];
  /** Peer ids currently drafting (thinking indicator) */
  thinking: string[];
}

export type OnlineMessage =
  | { t: "hello"; player: OnlinePlayer; wantsHost: boolean }
  | { t: "full_state"; state: OnlineCampfireState }
  | { t: "request_state" }
  | {
      t: "start";
      rules: GameRules;
      players: OnlinePlayer[];
      hostId: string;
      turnIndex: number;
      turnPlayerId: string;
      seq: number;
      seedId?: string;
      seedPrompt?: string;
      words?: StoryWord[];
    }
  | {
      t: "word";
      word: StoryWord;
      turnIndex: number;
      turnPlayerId: string;
      seq: number;
    }
  | {
      t: "skip";
      turnIndex: number;
      turnPlayerId: string;
      seq: number;
    }
  | {
      t: "undo";
      words: StoryWord[];
      turnIndex: number;
      turnPlayerId: string;
      seq: number;
    }
  | { t: "end_sentence"; words: StoryWord[]; seq: number }
  | { t: "finish"; title: string; words: StoryWord[]; seq: number }
  | { t: "set_host"; hostId: string; seq: number }
  | { t: "players"; players: OnlinePlayer[]; seq: number }
  | { t: "react"; wordId: string; emoji: string; by: string }
  | { t: "thinking"; playerId: string; active: boolean }
  | { t: "kick"; playerId: string; by: string }
  | { t: "bye"; playerId: string };

export function initialOnlineState(
  hostId: string,
  hostPlayer: OnlinePlayer,
): OnlineCampfireState {
  return {
    hostId,
    phase: "lobby",
    players: [{ ...hostPlayer, role: hostPlayer.role ?? "player" }],
    words: [],
    turnIndex: 0,
    turnPlayerId: hostPlayer.id,
    rules: { ...DEFAULT_RULES },
    pendingTitle: "",
    seq: 0,
    seedId: "none",
    seedPrompt: "",
    reactions: [],
    thinking: [],
  };
}

export function isOnlineMessage(data: unknown): data is OnlineMessage {
  return Boolean(data && typeof data === "object" && "t" in (data as object));
}

export function nextColorIndex(players: OnlinePlayer[]): number {
  return players.length % 8;
}

/** Resolve turn index from player id; clamp if missing. */
export function turnIndexForPlayer(
  players: OnlinePlayer[],
  turnPlayerId: string,
): number {
  if (players.length === 0) return 0;
  const idx = players.findIndex((p) => p.id === turnPlayerId);
  return idx >= 0 ? idx : 0;
}

/** Seated players who can take turns (not spectators). */
export function seatedPlayers(players: OnlinePlayer[]): OnlinePlayer[] {
  const seated = players.filter((p) => (p.role ?? "player") !== "spectator");
  return seated.length > 0 ? seated : players;
}

/** Advance turn to the next seated player after `fromId` (or first if unknown). */
export function nextTurn(
  players: OnlinePlayer[],
  fromId: string,
): { turnIndex: number; turnPlayerId: string } {
  const circle = seatedPlayers(players);
  if (circle.length === 0) {
    return { turnIndex: 0, turnPlayerId: "" };
  }
  const fromIdx = circle.findIndex((p) => p.id === fromId);
  const nextIdx = fromIdx >= 0 ? (fromIdx + 1) % circle.length : 0;
  const turnPlayerId = circle[nextIdx]!.id;
  const turnIndex = players.findIndex((p) => p.id === turnPlayerId);
  return {
    turnIndex: turnIndex >= 0 ? turnIndex : nextIdx,
    turnPlayerId,
  };
}

/**
 * Stable circle order: host first (if known), then remaining by peer id.
 * Same inputs -> same order on every client.
 */
export function orderPlayers(
  players: OnlinePlayer[],
  hostId: string,
): OnlinePlayer[] {
  const unique = new Map<string, OnlinePlayer>();
  for (const p of players) unique.set(p.id, p);
  const list = [...unique.values()];
  list.sort((a, b) => {
    if (hostId) {
      if (a.id === hostId) return -1;
      if (b.id === hostId) return 1;
    }
    return a.id.localeCompare(b.id);
  });
  return list.slice(0, MAX_REMOTE_PLAYERS);
}

/** Rebind the turn token onto a still-seated player after roster changes. */
export function normalizeTurn(
  players: OnlinePlayer[],
  turnPlayerId: string,
  turnIndex: number,
): { turnIndex: number; turnPlayerId: string } {
  const circle = seatedPlayers(players);
  if (circle.length === 0) {
    return { turnIndex: 0, turnPlayerId: "" };
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

export type RosterPeer = { id: string; name: string };

/**
 * Presence follows the live signaling roster (self + remote peers).
 * Prev supplies name/color/role for people still here. Prev-only ids were
 * kept forever, which left ghost seats after hang-up and stalled the token.
 */
export function mergeRoster(
  selfId: string,
  selfName: string,
  hostId: string,
  remotePeers: RosterPeer[],
  prev: OnlinePlayer[],
  phase: OnlinePhase,
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

  const roleFor = (id: string): OnlineRole => {
    const known = roleOf.get(id);
    if (known) return known;
    return phase === "playing" || phase === "finished" ? "spectator" : "player";
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
    byId.set(peer.id, {
      id: peer.id,
      name: peer.name || prevP?.name || "Guest",
      colorIndex: ensureColor(peer.id),
      role: roleFor(peer.id),
    });
  }

  return orderPlayers([...byId.values()], hostId);
}

export function isStaleGameSeq(incoming: number, local: number): boolean {
  return incoming <= local;
}

export function applyWordMessage(
  s: OnlineCampfireState,
  msg: Extract<OnlineMessage, { t: "word" }>,
): OnlineCampfireState {
  if (s.words.some((w) => w.id === msg.word.id)) {
    const turn = normalizeTurn(s.players, msg.turnPlayerId, msg.turnIndex);
    return {
      ...s,
      turnIndex: turn.turnIndex,
      turnPlayerId: turn.turnPlayerId,
      thinking: (s.thinking ?? []).filter((id) => id !== msg.word.playerId),
      seq: Math.max(s.seq, msg.seq),
    };
  }
  if (isStaleGameSeq(msg.seq, s.seq)) return s;
  const turn = normalizeTurn(s.players, msg.turnPlayerId, msg.turnIndex);
  return {
    ...s,
    phase: "playing",
    words: [...s.words, msg.word],
    turnIndex: turn.turnIndex,
    turnPlayerId: turn.turnPlayerId,
    thinking: (s.thinking ?? []).filter((id) => id !== msg.word.playerId),
    seq: msg.seq,
  };
}

export function applySkipMessage(
  s: OnlineCampfireState,
  msg: Extract<OnlineMessage, { t: "skip" }>,
): OnlineCampfireState {
  if (isStaleGameSeq(msg.seq, s.seq)) return s;
  const turn = normalizeTurn(s.players, msg.turnPlayerId, msg.turnIndex);
  return {
    ...s,
    turnIndex: turn.turnIndex,
    turnPlayerId: turn.turnPlayerId,
    seq: msg.seq,
  };
}

export type LiveRosterOpts = {
  selfId: string;
  selfName: string;
  remotePeers: RosterPeer[];
  isCreator?: boolean;
};

/** If the named host is gone, the remaining circle agrees on the first seat. */
export function reconcileHost(players: OnlinePlayer[], hostId: string): string {
  if (hostId && players.some((p) => p.id === hostId)) return hostId;
  return players[0]?.id ?? "";
}

function withTurnAndHost(
  s: OnlineCampfireState,
  players: OnlinePlayer[],
  hostId: string,
  turnPlayerId: string,
  turnIndex: number,
): OnlineCampfireState {
  const host = reconcileHost(players, hostId);
  const ordered = orderPlayers(players, host);
  const turn = normalizeTurn(ordered, turnPlayerId, turnIndex);
  const liveIds = new Set(ordered.map((p) => p.id));
  return {
    ...s,
    players: ordered,
    hostId: host,
    turnIndex: turn.turnIndex,
    turnPlayerId: turn.turnPlayerId,
    thinking: (s.thinking ?? []).filter((id) => liveIds.has(id)),
  };
}

/** Presence sync against the live signaling roster. Never bumps seq. */
export function applyLiveRoster(
  s: OnlineCampfireState,
  opts: LiveRosterOpts & { hostId: string },
): OnlineCampfireState {
  const preferredHost = opts.isCreator ? opts.selfId : opts.hostId;
  const merged = mergeRoster(
    opts.selfId,
    opts.selfName,
    preferredHost,
    opts.remotePeers,
    s.players,
    s.phase,
  );
  return withTurnAndHost(s, merged, preferredHost, s.turnPlayerId, s.turnIndex);
}

/** Hang-up / kick: drop the seat, move the token, fail over host if needed. */
export function dropSeatedPlayer(
  s: OnlineCampfireState,
  playerId: string,
): OnlineCampfireState {
  if (!s.players.some((p) => p.id === playerId)) return s;
  const remaining = s.players.filter((p) => p.id !== playerId);
  const preferredHost = s.hostId === playerId ? "" : s.hostId;
  return withTurnAndHost(s, remaining, preferredHost, s.turnPlayerId, s.turnIndex);
}

export function applyByeMessage(
  s: OnlineCampfireState,
  msg: Extract<OnlineMessage, { t: "bye" }>,
): OnlineCampfireState {
  return dropSeatedPlayer(s, msg.playerId);
}

/**
 * Hello only seats people still on the live roster. A delayed hello after
 * hang-up must not resurrect a ghost seat.
 */
export function applyHelloMessage(
  s: OnlineCampfireState,
  msg: Extract<OnlineMessage, { t: "hello" }>,
  opts: LiveRosterOpts,
): OnlineCampfireState {
  const liveIds = new Set([opts.selfId, ...opts.remotePeers.map((p) => p.id)]);
  let preferredHost = opts.isCreator ? opts.selfId : s.hostId;
  if (!opts.isCreator && liveIds.has(msg.player.id)) {
    if (msg.wantsHost) preferredHost = msg.player.id;
    else if (!preferredHost) preferredHost = msg.player.id;
  }

  let prev = s.players;
  if (liveIds.has(msg.player.id)) {
    let found = false;
    prev = s.players.map((p) => {
      if (p.id !== msg.player.id) return p;
      found = true;
      return {
        ...p,
        name: msg.player.name,
        role: msg.player.role ?? p.role,
      };
    });
    if (!found) {
      const role =
        msg.player.role ??
        (s.phase === "playing" || s.phase === "finished" ? "spectator" : "player");
      prev = [
        ...prev,
        {
          ...msg.player,
          colorIndex: nextColorIndex(prev),
          role,
        },
      ];
    }
  }

  const merged = mergeRoster(
    opts.selfId,
    opts.selfName,
    preferredHost,
    opts.remotePeers,
    prev,
    s.phase,
  );
  return withTurnAndHost(s, merged, preferredHost, s.turnPlayerId, s.turnIndex);
}

/** Light-fire snapshot, then prune anyone who already hung up. */
export function applyStartMessage(
  s: OnlineCampfireState,
  msg: Extract<OnlineMessage, { t: "start" }>,
  opts: LiveRosterOpts,
): OnlineCampfireState {
  if (msg.seq < s.seq && s.phase === "playing") return s;
  const preferredHost = opts.isCreator ? opts.selfId : msg.hostId || s.hostId;
  const snapshot =
    msg.players?.length > 0
      ? msg.players.map((p) =>
          p.id === opts.selfId
            ? { ...p, name: opts.selfName, role: "player" as const }
            : { ...p, role: p.role ?? "player" },
        )
      : s.players.map((p) => ({ ...p, role: "player" as const }));
  const merged = mergeRoster(
    opts.selfId,
    opts.selfName,
    preferredHost,
    opts.remotePeers,
    snapshot,
    "lobby",
  ).map((p) => ({ ...p, role: "player" as const }));
  const next = withTurnAndHost(
    s,
    merged,
    preferredHost,
    msg.turnPlayerId || merged[0]?.id || "",
    msg.turnIndex ?? 0,
  );
  return {
    ...next,
    phase: "playing",
    words: msg.words?.length ? msg.words : [],
    rules: {
      ...DEFAULT_RULES,
      ...msg.rules,
      noRepeatedWords: msg.rules.noRepeatedWords ?? false,
    },
    pendingTitle: "",
    seq: msg.seq,
    seedId: msg.seedId ?? "none",
    seedPrompt: msg.seedPrompt ?? "",
    reactions: [],
    thinking: [],
  };
}

export function mergeReaction(
  reactions: WordReaction[],
  next: WordReaction,
): WordReaction[] {
  const without = reactions.filter(
    (r) => !(r.wordId === next.wordId && r.by === next.by && r.emoji === next.emoji),
  );
  // Toggle: if same reaction already exists, remove it
  const existed = reactions.some(
    (r) => r.wordId === next.wordId && r.by === next.by && r.emoji === next.emoji,
  );
  if (existed) return without;
  return [...without.filter((r) => !(r.wordId === next.wordId && r.by === next.by)), next].slice(
    -200,
  );
}

export const REACTION_EMOJIS = ["🔥", "✨", "😂", "😮", "❤️"] as const;
