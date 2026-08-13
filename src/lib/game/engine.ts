import type { GameRules, StoryStats, StoryWord } from "./types";
import { KIDS_BANNED_DEFAULT } from "./types";

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function endsWithSentence(text: string): boolean {
  return /[.!?…]$/.test(text.trim());
}

export function suggestTitle(words: StoryWord[]): string {
  if (words.length === 0) return "Silent night";
  const first = words
    .slice(0, 8)
    .map((w) => w.text.replace(/[.!?…,;:]+$/g, ""))
    .join(" ");
  return first.length > 48 ? `${first.slice(0, 46)}…` : first;
}

export function formatStoryText(words: StoryWord[]): string {
  return words
    .map((w, i) => {
      const next = words[i + 1];
      const needsSpace = next && !/^[.!?,;:…]/.test(next.text);
      return w.text + (needsSpace ? " " : "");
    })
    .join("")
    .replace(/\s+([.!?,;:…])/g, "$1");
}

export function formatStoryMarkdown(title: string, words: StoryWord[], players: string[]): string {
  const body = formatStoryText(words);
  return `# ${title}\n\n${body}\n\n- *Wordfire · Ember Circle* · ${players.join(", ")}\n`;
}

export function wordCore(token: string): string {
  return token.toLowerCase().replace(/[.!?…,;:'’-]/g, "");
}

export function computeStoryStats(
  words: StoryWord[],
  finishedAt = Date.now(),
): StoryStats {
  const start = words[0]?.createdAt ?? finishedAt;
  const contributors = new Set(words.map((w) => w.playerId));
  return {
    wordCount: words.length,
    uniqueContributors: contributors.size,
    durationMs: Math.max(0, finishedAt - start),
    sentenceCount: words.filter((w) => w.endsSentence).length || (words.length ? 1 : 0),
  };
}

export function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function bannedSet(rules: GameRules): Set<string> {
  const list = [
    ...(rules.kidsMode ? KIDS_BANNED_DEFAULT : []),
    ...rules.bannedWords.map((w) => w.toLowerCase().trim()).filter(Boolean),
  ];
  return new Set(list);
}

function stripOuterJunk(token: string): string {
  return token.replace(/^[^\p{L}\p{N}'-]+/u, "").replace(/[^\p{L}\p{N}'\-!.?…]+$/u, (m) => {
    // keep single trailing sentence ender if present
    const end = m.match(/[.!?…]/);
    return end ? end[0] : "";
  });
}

export type SanitizeResult =
  | { ok: true; text: string; endsSentence: boolean }
  | { ok: false; reason: string };

/**
 * Validate and normalize a contribution under the active rules.
 * Word mode: exactly one token. Phrase mode: 1..maxTokens tokens.
 */
export function sanitizeContribution(
  raw: string,
  rules: GameRules,
  priorWords: StoryWord[] = [],
): SanitizeResult {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return { ok: false, reason: "Say something first." };
  }
  if (trimmed.length > rules.maxLength) {
    return { ok: false, reason: `Keep it under ${rules.maxLength} characters.` };
  }

  const tokens = trimmed.split(" ").filter(Boolean);
  const maxTok = rules.mode === "word" ? 1 : Math.min(5, Math.max(2, rules.maxTokens));

  if (rules.mode === "word" && tokens.length > 1) {
    return { ok: false, reason: "One word only - no spaces." };
  }
  if (rules.mode === "phrase" && tokens.length > maxTok) {
    return { ok: false, reason: `Up to ${maxTok} words this turn.` };
  }

  const cleaned: string[] = [];
  const banned = bannedSet(rules);
  const used = rules.noRepeatedWords
    ? new Set(
        priorWords.flatMap((w) =>
          w.text
            .split(/\s+/)
            .map(wordCore)
            .filter(Boolean),
        ),
      )
    : null;

  for (const t of tokens) {
    let token = t;
    if (!rules.allowPunctuation) {
      token = token.replace(/[.!?…,;:]+/g, "");
    }
    token = stripOuterJunk(token);
    if (!token) {
      return { ok: false, reason: "That does not look like a word." };
    }
    // Core letters for ban check
    const core = wordCore(token);
    if (banned.has(core)) {
      return { ok: false, reason: "That word is set aside for this circle." };
    }
    if (used?.has(core)) {
      return { ok: false, reason: "That word is already in the story." };
    }
    // Allow letters, numbers, apostrophe, hyphen, optional trailing punct
    if (!/^[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*[.!?…,]?$/u.test(token)) {
      return { ok: false, reason: "Letters and simple punctuation only." };
    }
    cleaned.push(token);
  }

  const text = cleaned.join(" ");
  return {
    ok: true,
    text,
    endsSentence: rules.allowPunctuation && endsWithSentence(text),
  };
}

export function closeLastWord(words: StoryWord[]): StoryWord[] {
  if (words.length === 0) return words;
  const last = words[words.length - 1]!;
  if (last.endsSentence) return words;
  return [
    ...words.slice(0, -1),
    {
      ...last,
      text: last.text.replace(/[,;:]*$/, "") + ".",
      endsSentence: true,
    },
  ];
}

export const PLAYER_COLORS = [
  "#f0a060",
  "#e8c4a0",
  "#c8d4c0",
  "#a8c0d8",
  "#d4a8b8",
  "#d8c878",
  "#a8b8a0",
  "#c0b0d0",
] as const;

export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 2;
