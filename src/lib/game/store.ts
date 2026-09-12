import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AiPersonaId } from "@/lib/ai/personas";
import { nextAiName, personaById } from "@/lib/ai/personas";
import {
  closeLastWord,
  computeStoryStats,
  formatStoryText,
  sanitizeContribution,
  suggestTitle,
  uid,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
} from "./engine";
import { seedById } from "./seeds";
import {
  DEFAULT_RULES,
  DEFAULT_SETTINGS,
  type AppSettings,
  type FinishedStory,
  type GameRules,
  type GameSession,
  type Player,
} from "./types";

export {
  formatStoryText,
  formatStoryMarkdown,
  suggestTitle,
  computeStoryStats,
  formatDuration,
  PLAYER_COLORS,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "./engine";
export type { StoryWord, FinishedStory, GameRules, ContributionMode, Player } from "./types";

function mergeSettings(partial?: Partial<AppSettings> | AppSettings): AppSettings {
  const base = DEFAULT_SETTINGS;
  return {
    seenOnboarding: partial?.seenOnboarding ?? base.seenOnboarding,
    accessibility: {
      ...base.accessibility,
      ...(partial?.accessibility ?? {}),
    },
    immersion: {
      ...base.immersion,
      ...(partial?.immersion ?? {}),
    },
  };
}

function canStartWith(players: Player[]): boolean {
  if (players.length < MIN_PLAYERS) return false;
  // Need at least one human when AI friends are present; pure human circles OK
  const humans = players.filter((p) => p.kind !== "ai");
  if (humans.length === 0) return false;
  return true;
}

interface GameStore extends GameSession {
  archive: FinishedStory[];
  settings: AppSettings;
  setupNameDraft: string;

  setSetupNameDraft: (v: string) => void;
  addPlayer: (name?: string) => boolean;
  addAiFriend: (personaId?: AiPersonaId) => boolean;
  removePlayer: (id: string) => void;
  reorderPlayers: (from: number, to: number) => void;
  patchRules: (partial: Partial<GameRules>) => void;
  patchSettings: (partial: Partial<AppSettings>) => void;
  markOnboardingSeen: () => void;
  setSeedId: (seedId: string) => void;

  startGame: () => boolean;
  addContribution: (raw: string) => { ok: true } | { ok: false; reason: string };
  endSentence: () => void;
  skipTurn: () => void;
  undoLast: () => void;
  resetTurnTimer: () => void;

  beginFinish: () => void;
  setPendingTitle: (title: string) => void;
  confirmFinish: () => FinishedStory | null;
  continueStory: () => void;
  resetSession: (keepPlayers?: boolean) => void;

  deleteStory: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateStoryTitle: (id: string, title: string) => void;
  clearArchive: () => void;
  getStory: (id: string) => FinishedStory | undefined;
}

const emptySession = (): Pick<
  GameSession,
  | "phase"
  | "words"
  | "turnIndex"
  | "turnStartedAt"
  | "lastFinished"
  | "pendingTitle"
  | "seedId"
> => ({
  phase: "idle",
  words: [],
  turnIndex: 0,
  turnStartedAt: null,
  lastFinished: null,
  pendingTitle: "",
  seedId: "none",
});

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...emptySession(),
      players: [],
      rules: { ...DEFAULT_RULES },
      archive: [],
      settings: mergeSettings(),
      setupNameDraft: "",

      setSetupNameDraft: (v) => set({ setupNameDraft: v }),

      addPlayer: (name) => {
        const { players, setupNameDraft } = get();
        if (players.length >= MAX_PLAYERS) return false;
        const n = (name ?? setupNameDraft).trim().replace(/\s+/g, " ");
        if (!n || n.length > 24) return false;
        if (players.some((p) => p.name.toLowerCase() === n.toLowerCase())) return false;
        const player: Player = {
          id: uid("p"),
          name: n,
          colorIndex: players.length % 8,
          kind: "human",
        };
        set({ players: [...players, player], setupNameDraft: "" });
        return true;
      },

      addAiFriend: (personaId = "ember") => {
        const { players } = get();
        if (players.length >= MAX_PLAYERS) return false;
        const persona = personaById(personaId);
        const name = nextAiName(
          players.map((p) => p.name),
          persona,
        );
        const player: Player = {
          id: uid("ai"),
          name,
          colorIndex: players.length % 8,
          kind: "ai",
          aiPersona: persona.id,
        };
        set({ players: [...players, player] });
        return true;
      },

      removePlayer: (id) => {
        set((s) => ({
          players: s.players
            .filter((p) => p.id !== id)
            .map((p, i) => ({ ...p, colorIndex: i % 8 })),
        }));
      },

      reorderPlayers: (from, to) => {
        set((s) => {
          if (from < 0 || to < 0 || from >= s.players.length || to >= s.players.length) return s;
          const next = [...s.players];
          const [item] = next.splice(from, 1);
          if (!item) return s;
          next.splice(to, 0, item);
          return {
            players: next.map((p, i) => ({ ...p, colorIndex: i % 8 })),
          };
        });
      },

      patchRules: (partial) => {
        set((s) => ({ rules: { ...s.rules, ...partial } }));
      },

      patchSettings: (partial) => {
        set((s) => ({
          settings: mergeSettings({
            ...s.settings,
            ...partial,
            accessibility: {
              ...s.settings.accessibility,
              ...(partial.accessibility ?? {}),
            },
            immersion: {
              ...s.settings.immersion,
              ...(partial.immersion ?? {}),
            },
          }),
        }));
      },

      markOnboardingSeen: () => {
        set((s) => ({ settings: { ...s.settings, seenOnboarding: true } }));
      },

      setSeedId: (seedId) => set({ seedId }),

      startGame: () => {
        const { players, rules, seedId } = get();
        if (!canStartWith(players)) return false;
        // Prefer a human to go first when mixed
        let turnIndex = 0;
        const firstHuman = players.findIndex((p) => p.kind !== "ai");
        if (firstHuman >= 0) turnIndex = firstHuman;
        const seed = seedById(seedId);
        const seedWords = seed.prompt
          ? seed.prompt
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .map((text, i) => ({
                id: uid("seed"),
                text: i === 0 ? text : text,
                playerId: "seed",
                playerName: "Seed",
                colorIndex: 0,
                endsSentence: false,
                createdAt: Date.now(),
              }))
          : [];
        set({
          phase: "playing",
          words: seedWords,
          turnIndex,
          turnStartedAt: Date.now(),
          lastFinished: null,
          pendingTitle: "",
          rules: { ...rules, noRepeatedWords: rules.noRepeatedWords ?? false },
        });
        return true;
      },

      addContribution: (raw) => {
        const { players, turnIndex, words, rules, phase } = get();
        if (phase !== "playing") {
          return { ok: false as const, reason: "The circle is not live yet." };
        }
        if (players.length === 0) {
          return { ok: false as const, reason: "No players." };
        }
        const result = sanitizeContribution(raw, rules, words);
        if (!result.ok) return result;

        const player = players[turnIndex % players.length]!;
        const entry = {
          id: uid("w"),
          text: result.text,
          playerId: player.id,
          playerName: player.name,
          colorIndex: player.colorIndex,
          endsSentence: result.endsSentence,
          createdAt: Date.now(),
        };
        set({
          words: [...words, entry],
          turnIndex: (turnIndex + 1) % players.length,
          turnStartedAt: Date.now(),
        });
        return { ok: true as const };
      },

      endSentence: () => {
        const { words, phase } = get();
        if (phase !== "playing" || words.length === 0) return;
        set({ words: closeLastWord(words) });
      },

      skipTurn: () => {
        const { players, turnIndex, phase } = get();
        if (phase !== "playing" || players.length === 0) return;
        set({
          turnIndex: (turnIndex + 1) % players.length,
          turnStartedAt: Date.now(),
        });
      },

      undoLast: () => {
        const { words, players, turnIndex, phase } = get();
        if (phase !== "playing" || words.length === 0 || players.length === 0) return;
        const prev = words[words.length - 1]!;
        const authorIdx = players.findIndex((p) => p.id === prev.playerId);
        set({
          words: words.slice(0, -1),
          turnIndex: authorIdx >= 0 ? authorIdx : (turnIndex - 1 + players.length) % players.length,
          turnStartedAt: Date.now(),
        });
      },

      resetTurnTimer: () => set({ turnStartedAt: Date.now() }),

      beginFinish: () => {
        const { words, phase } = get();
        if (phase !== "playing" || words.length === 0) return;
        const closed = closeLastWord(words);
        set({
          words: closed,
          phase: "finished",
          pendingTitle: suggestTitle(closed),
          turnStartedAt: null,
          lastFinished: null,
        });
      },

      setPendingTitle: (title) => set({ pendingTitle: title.slice(0, 80) }),

      confirmFinish: () => {
        const {
          words,
          players,
          archive,
          pendingTitle,
          rules,
          phase,
          lastFinished,
          settings,
          seedId,
        } = get();
        if (words.length === 0) return lastFinished;
        if (
          lastFinished &&
          lastFinished.words.length === words.length &&
          lastFinished.words.every((w, i) => w.id === words[i]?.id)
        ) {
          return lastFinished;
        }
        if (phase !== "finished" && phase !== "playing") return lastFinished;

        const title = pendingTitle.trim() || suggestTitle(words);
        const finishedAt = Date.now();
        const seed = seedById(seedId);
        const finished: FinishedStory = {
          id: uid("story"),
          title,
          words: [...words],
          players: [...players],
          createdAt: words[0]?.createdAt ?? finishedAt,
          finishedAt,
          wordCount: words.length,
          rules: { mode: rules.mode, maxTokens: rules.maxTokens },
          favorite: false,
          theme: settings.immersion?.theme ?? "night",
          seedId: seed.id !== "none" ? seed.id : undefined,
          seedLabel: seed.id !== "none" ? seed.label : undefined,
          stats: computeStoryStats(words, finishedAt),
        };
        set({
          archive: [finished, ...archive.filter((a) => a.id !== finished.id)].slice(0, 100),
          lastFinished: finished,
          phase: "finished",
          pendingTitle: title,
        });
        return finished;
      },

      continueStory: () => {
        set({
          phase: "playing",
          lastFinished: null,
          pendingTitle: "",
          turnStartedAt: Date.now(),
        });
      },

      resetSession: (keepPlayers = true) => {
        set({
          ...emptySession(),
          players: keepPlayers ? get().players : [],
          setupNameDraft: "",
        });
      },

      deleteStory: (id) => {
        set((s) => ({
          archive: s.archive.filter((a) => a.id !== id),
          lastFinished: s.lastFinished?.id === id ? null : s.lastFinished,
        }));
      },

      toggleFavorite: (id) => {
        set((s) => ({
          archive: s.archive.map((a) =>
            a.id === id ? { ...a, favorite: !a.favorite } : a,
          ),
        }));
      },

      updateStoryTitle: (id, title) => {
        const t = title.trim().slice(0, 80);
        if (!t) return;
        set((s) => ({
          archive: s.archive.map((a) => (a.id === id ? { ...a, title: t } : a)),
          lastFinished:
            s.lastFinished?.id === id ? { ...s.lastFinished, title: t } : s.lastFinished,
          pendingTitle: s.lastFinished?.id === id || s.phase === "finished" ? t : s.pendingTitle,
        }));
      },

      clearArchive: () => set({ archive: [], lastFinished: null }),

      getStory: (id) => get().archive.find((a) => a.id === id),
    }),
    {
      name: "wordfire-v2",
      partialize: (s) => ({
        archive: s.archive,
        players: s.players,
        rules: s.rules,
        settings: s.settings,
        phase: s.phase,
        words: s.words,
        turnIndex: s.turnIndex,
        pendingTitle: s.pendingTitle,
        lastFinished: s.lastFinished,
        seedId: s.seedId,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameStore>;
        return {
          ...current,
          ...p,
          seedId: p.seedId ?? "none",
          settings: mergeSettings(p.settings),
          rules: { ...DEFAULT_RULES, ...(p.rules ?? {}) },
          players: (p.players ?? current.players).map((pl) => ({
            ...pl,
            kind: pl.kind ?? "human",
          })),
        };
      },
    },
  ),
);

export function isAiPlayer(p: Player | undefined): boolean {
  return p?.kind === "ai";
}
