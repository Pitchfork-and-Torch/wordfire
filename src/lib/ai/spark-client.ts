import type { GameRules, StoryWord } from "@/lib/game/types";
import { sanitizeContribution } from "@/lib/game/engine";
import type { AiPersonaId } from "./personas";
import { generateLocalSpark } from "./local-spark";

export type SparkRequest = {
  words: StoryWord[];
  rules: GameRules;
  personaId?: AiPersonaId;
  playerName: string;
};

/**
 * Ask the server for a live spark; fall back to local persona generator.
 * Always returns a rule-sanitized contribution string.
 */
export async function requestSpark(req: SparkRequest): Promise<{
  text: string;
  source: "live" | "local";
}> {
  try {
    const res = await fetch("/api/spark", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        words: req.words.map((w) => ({ text: w.text, endsSentence: w.endsSentence })),
        mode: req.rules.mode,
        maxTokens: req.rules.maxTokens,
        maxLength: req.rules.maxLength,
        allowPunctuation: req.rules.allowPunctuation,
        kidsMode: req.rules.kidsMode,
        bannedWords: req.rules.bannedWords,
        personaId: req.personaId ?? "ember",
        playerName: req.playerName,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { text?: string };
      if (data.text) {
        const clean = sanitizeContribution(data.text, req.rules);
        if (clean.ok) return { text: clean.text, source: "live" };
      }
    }
  } catch {
    /* use local */
  }

  return {
    text: generateLocalSpark({
      words: req.words,
      rules: req.rules,
      personaId: req.personaId,
    }),
    source: "local",
  };
}
