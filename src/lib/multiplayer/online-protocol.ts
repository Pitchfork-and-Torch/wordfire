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
  | { t: "kick"; playerId: string; by: string };

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
