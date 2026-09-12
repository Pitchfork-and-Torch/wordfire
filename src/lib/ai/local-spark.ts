import type { GameRules, StoryWord } from "@/lib/game/types";
import { formatStoryText, sanitizeContribution } from "@/lib/game/engine";
import { personaById, type AiPersonaId } from "./personas";

/** Curated banks — offline AI friends still feel distinct without a network. */
const BANKS: Record<
  AiPersonaId,
  { openers: string[]; mid: string[]; twist: string[]; ends: string[] }
> = {
  ember: {
    openers: ["softly", "together", "warm", "gently", "quietly", "hopeful"],
    mid: [
      "firelight",
      "promise",
      "path",
      "friend",
      "circle",
      "whisper",
      "homeward",
      "kindness",
      "shared",
      "story",
      "ember",
      "lantern",
    ],
    twist: ["nevertheless", "somehow", "still", "again", "beyond"],
    ends: ["rested.", "smiled.", "listened.", "began.", "stayed."],
  },
  trickster: {
    openers: ["suddenly", "oops", "wait", "actually", "meanwhile"],
    mid: [
      "banana",
      "raccoon",
      "plot-twist",
      "hiccup",
      "mischief",
      "sneaky",
      "juggled",
      "giggled",
      "reversed",
      "chaos",
      "socks",
      "accidentally",
    ],
    twist: ["but", "until", "except", "unless", "then"],
    ends: ["vanished!", "winked.", "tripped.", "laughed.", "shrugged."],
  },
  poet: {
    openers: ["beneath", "amid", "toward", "within", "across"],
    mid: [
      "moonlit",
      "silver",
      "breath",
      "tide",
      "memory",
      "velvet",
      "horizon",
      "echo",
      "petal",
      "dusk",
      "starlit",
      "river",
    ],
    twist: ["like", "as", "until", "where", "while"],
    ends: ["bloomed.", "faded.", "shimmered.", "sang.", "slept."],
  },
  noir: {
    openers: ["after", "under", "past", "against", "near"],
    mid: [
      "rain",
      "alley",
      "shadow",
      "cigarette",
      "case",
      "silent",
      "clock",
      "stranger",
      "doorway",
      "secret",
      "cold",
      "night",
    ],
    twist: ["but", "though", "yet", "until", "when"],
    ends: ["waited.", "vanished.", "watched.", "closed.", "spoke."],
  },
  sage: {
    openers: ["long", "once", "deep", "among", "beyond"],
    mid: [
      "forest",
      "stone",
      "root",
      "elder",
      "moss",
      "quiet",
      "mountain",
      "riverstone",
      "owl",
      "season",
      "patience",
      "trail",
    ],
    twist: ["and", "until", "where", "while", "then"],
    ends: ["listened.", "grew.", "remembered.", "returned.", "rested."],
  },
  spark: {
    openers: ["then", "next", "quickly", "soon", "now"],
    mid: [
      "ran",
      "opened",
      "found",
      "climbed",
      "called",
      "bright",
      "door",
      "map",
      "key",
      "raced",
      "jumped",
      "noticed",
    ],
    twist: ["and", "so", "then", "until", "before"],
    ends: ["arrived.", "started.", "cheered.", "continued.", "grinned."],
  },
};

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lastToken(words: StoryWord[]): string {
  if (words.length === 0) return "";
  return words[words.length - 1]!.text.replace(/[.!?…,;:]+$/, "").toLowerCase();
}

function storyEndsSentence(words: StoryWord[]): boolean {
  if (words.length === 0) return true;
  return Boolean(words[words.length - 1]?.endsSentence);
}

/**
 * Offline contribution for an AI friend — deterministic-ish, persona-flavored,
 * rule-compliant. Used when the live API is unavailable.
 */
export function generateLocalSpark(opts: {
  words: StoryWord[];
  rules: GameRules;
  personaId?: AiPersonaId;
  seed?: number;
}): string {
  const persona = personaById(opts.personaId);
  const bank = BANKS[persona.id];
  const rnd = mulberry32(
    opts.seed ??
      (opts.words.length * 997 +
        (opts.words[opts.words.length - 1]?.createdAt ?? Date.now()) +
        persona.name.length * 13),
  );

  const recent = new Set(
    opts.words
      .slice(-12)
      .map((w) => w.text.toLowerCase().replace(/[.!?…,;:]+$/, "")),
  );
  const ends = storyEndsSentence(opts.words);
  const last = lastToken(opts.words);

  const avoid = (w: string) => {
    const core = w.toLowerCase().replace(/[.!?…,;:]+$/, "");
    return recent.has(core) || core === last;
  };

  const take = (list: string[]) => {
    const shuffled = [...list].sort(() => rnd() - 0.5);
    return shuffled.find((w) => !avoid(w)) ?? pick(list, rnd);
  };

  let candidate: string;

  if (opts.rules.mode === "phrase") {
    const n = Math.min(
      opts.rules.maxTokens,
      2 + (rnd() < 0.4 ? 1 : 0) + (rnd() < 0.25 ? 1 : 0),
    );
    const parts: string[] = [];
    if (ends) parts.push(take(bank.openers));
    else if (rnd() < 0.35) parts.push(take(bank.twist));
    while (parts.length < n - (rnd() < persona.endSentenceBias ? 1 : 0)) {
      parts.push(take(rnd() < persona.wildness ? bank.twist.concat(bank.mid) : bank.mid));
    }
    if (opts.rules.allowPunctuation && rnd() < persona.endSentenceBias) {
      parts.push(take(bank.ends).replace(/\.$/, ""));
      candidate = `${parts.slice(0, n).join(" ")}.`;
    } else {
      candidate = parts.slice(0, n).join(" ");
    }
  } else {
    // word mode
    if (ends) {
      candidate = take(bank.openers.concat(bank.mid));
    } else if (rnd() < persona.endSentenceBias && opts.rules.allowPunctuation) {
      candidate = take(bank.ends);
    } else if (rnd() < persona.wildness * 0.5) {
      candidate = take(bank.twist.concat(bank.mid));
    } else {
      candidate = take(bank.mid);
    }
  }

  // Kids mode: strip spicy trickster bits roughly by re-picking ember bank
  if (opts.rules.kidsMode && persona.id === "trickster") {
    candidate = take(BANKS.ember.mid);
  }

  const sanitized = sanitizeContribution(candidate, opts.rules);
  if (sanitized.ok) return sanitized.text;

  // Safe fallback
  const fallback = sanitizeContribution(ends ? "then" : "and", opts.rules);
  if (fallback.ok) return fallback.text;
  return "softly";
}

export function buildSparkPrompt(opts: {
  words: StoryWord[];
  rules: GameRules;
  personaId?: AiPersonaId;
  playerName: string;
}): { system: string; user: string } {
  const persona = personaById(opts.personaId);
  const story = formatStoryText(opts.words) || "(the story has not started)";
  const mode =
    opts.rules.mode === "word"
      ? "exactly ONE word (no spaces)"
      : `a short phrase of 1–${opts.rules.maxTokens} words`;
  const kids = opts.rules.kidsMode
    ? "Keep it fully kid-safe: no violence, romance, or crude language."
    : "Keep it collaborative and fun for friends around a campfire.";
  const banned =
    opts.rules.bannedWords.length > 0
      ? `Never use: ${opts.rules.bannedWords.join(", ")}.`
      : "";

  return {
    system: `You are ${opts.playerName}, an AI friend in a pass-and-play collaborative storytelling game called Wordfire. Style: ${persona.style}. ${kids} ${banned} Reply with ONLY the contribution text — no quotes, no explanation.`,
    user: `Story so far:\n${story}\n\nRules: contribute ${mode}. Max ${opts.rules.maxLength} characters.${opts.rules.allowPunctuation ? " You may end with . ! or ?" : " No punctuation."}\n\nYour turn as ${opts.playerName}:`,
  };
}
