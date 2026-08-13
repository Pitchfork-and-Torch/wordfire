import type { AiPersonaId } from "@/lib/ai/personas";

export type PlayerId = string;

export type PlayerKind = "human" | "ai";

export interface Player {
  id: PlayerId;
  name: string;
  /** Soft hue index for coloring their words (0–7) */
  colorIndex: number;
  kind?: PlayerKind;
  /** Set when kind === "ai" */
  aiPersona?: AiPersonaId;
}

export interface StoryWord {
  id: string;
  text: string;
  playerId: PlayerId;
  playerName: string;
  colorIndex: number;
  endsSentence: boolean;
  createdAt: number;
}

export type ContributionMode = "word" | "phrase";

export interface GameRules {
  /** word = one token; phrase = up to maxTokens tokens */
  mode: ContributionMode;
  /** Max tokens per turn when mode is phrase (2-5) */
  maxTokens: number;
  /** Max characters per contribution */
  maxLength: number;
  /** Allow trailing . ! ? in contributions */
  allowPunctuation: boolean;
  /** Soft kids filter */
  kidsMode: boolean;
  /** Custom banned words (lowercase) */
  bannedWords: string[];
  /** Turn timer in seconds; 0 = off */
  turnTimerSeconds: number;
  /** Block reusing a word already in the story (case-insensitive core) */
  noRepeatedWords: boolean;
}

export interface StoryStats {
  wordCount: number;
  uniqueContributors: number;
  durationMs: number;
  sentenceCount: number;
}

export interface FinishedStory {
  id: string;
  title: string;
  words: StoryWord[];
  players: Player[];
  createdAt: number;
  finishedAt: number;
  wordCount: number;
  rules?: Pick<GameRules, "mode" | "maxTokens">;
  favorite?: boolean;
  theme?: AtmosphereTheme;
  /** Optional seed label used when the circle started */
  seedId?: string;
  seedLabel?: string;
  stats?: StoryStats;
}

export type SessionPhase = "idle" | "playing" | "finished";

export interface GameSession {
  phase: SessionPhase;
  players: Player[];
  words: StoryWord[];
  turnIndex: number;
  rules: GameRules;
  /** When current turn started (for timer) */
  turnStartedAt: number | null;
  lastFinished: FinishedStory | null;
  /** Pending title while finishing */
  pendingTitle: string;
  /** Optional story seed id from seeds catalog */
  seedId: string;
}

export type AtmosphereTheme = "night" | "forest" | "cabin" | "space" | "minimal";

export interface AccessibilityPrefs {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface ImmersionPrefs {
  theme: AtmosphereTheme;
  /** Master ambient toggle — off by default */
  soundEnabled: boolean;
  /** 0–1 */
  soundVolume: number;
  dismissedInstallHint: boolean;
}

export interface AppSettings {
  accessibility: AccessibilityPrefs;
  immersion: ImmersionPrefs;
  /** Has seen first-time onboarding tip */
  seenOnboarding: boolean;
}

export const DEFAULT_RULES: GameRules = {
  mode: "word",
  maxTokens: 3,
  maxLength: 48,
  allowPunctuation: true,
  kidsMode: false,
  bannedWords: [],
  turnTimerSeconds: 0,
  noRepeatedWords: false,
};

export const DEFAULT_SETTINGS: AppSettings = {
  accessibility: {
    largeText: false,
    highContrast: false,
    reducedMotion: false,
  },
  immersion: {
    theme: "night",
    soundEnabled: false,
    soundVolume: 0.35,
    dismissedInstallHint: false,
  },
  seenOnboarding: false,
};

export const THEME_META: Record<
  AtmosphereTheme,
  { label: string; blurb: string; themeColor: string }
> = {
  night: {
    label: "Classic Night",
    blurb: "Deep charcoal, ember glow",
    themeColor: "#0c0a09",
  },
  forest: {
    label: "Forest Glade",
    blurb: "Moss and cool understory",
    themeColor: "#0a100e",
  },
  cabin: {
    label: "Cozy Cabin",
    blurb: "Warm wood and hearth light",
    themeColor: "#120e0a",
  },
  space: {
    label: "Starry Space",
    blurb: "Void black, cold starlight",
    themeColor: "#07080f",
  },
  minimal: {
    label: "Minimal",
    blurb: "Quiet abstract dark",
    themeColor: "#0b0b0c",
  },
};

/** Mild default kids list — not exhaustive */
export const KIDS_BANNED_DEFAULT = [
  "shit",
  "fuck",
  "damn",
  "ass",
  "bitch",
  "hell",
  "crap",
  "bastard",
  "dick",
  "piss",
  "slut",
  "whore",
  "cunt",
  "fag",
  "nigger",
  "retard",
];
