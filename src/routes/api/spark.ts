import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sanitizeContribution } from "@/lib/game/engine";
import type { GameRules, StoryWord } from "@/lib/game/types";
import { buildSparkPrompt, generateLocalSpark } from "@/lib/ai/local-spark";
import type { AiPersonaId } from "@/lib/ai/personas";

const bodySchema = z.object({
  words: z
    .array(
      z.object({
        text: z.string(),
        endsSentence: z.boolean().optional(),
      }),
    )
    .max(400),
  mode: z.enum(["word", "phrase"]),
  maxTokens: z.number().int().min(2).max(5).default(3),
  maxLength: z.number().int().min(8).max(80).default(48),
  allowPunctuation: z.boolean().default(true),
  kidsMode: z.boolean().default(false),
  bannedWords: z.array(z.string()).max(64).default([]),
  personaId: z
    .enum(["ember", "trickster", "poet", "noir", "sage", "spark"])
    .default("ember"),
  playerName: z.string().max(24).default("Ember"),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function liveComplete(system: string, user: string): Promise<string | null> {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;

  const models = ["grok-3-mini", "grok-3", "grok-2-1212"];
  for (const model of models) {
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.9,
          max_tokens: 32,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text.replace(/^["'“”]|["'“”]$/g, "").split("\n")[0]!.trim();
    } catch {
      /* try next model */
    }
  }
  return null;
}

async function handlePost({ request }: { request: Request }) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid body" }, 400);
  const b = parsed.data;

  const rules: GameRules = {
    mode: b.mode,
    maxTokens: b.maxTokens,
    maxLength: b.maxLength,
    allowPunctuation: b.allowPunctuation,
    kidsMode: b.kidsMode,
    bannedWords: b.bannedWords,
    turnTimerSeconds: 0,
    noRepeatedWords: false,
  };

  const words = b.words.map((w, i) => ({
    id: `s-${i}`,
    text: w.text,
    playerId: "x",
    playerName: "x",
    colorIndex: 0,
    endsSentence: Boolean(w.endsSentence),
    createdAt: i,
  })) as StoryWord[];

  const { system, user } = buildSparkPrompt({
    words,
    rules,
    personaId: b.personaId as AiPersonaId,
    playerName: b.playerName,
  });

  const live = await liveComplete(system, user);
  if (live) {
    const clean = sanitizeContribution(live, rules);
    if (clean.ok) {
      return json({ text: clean.text, source: "live" });
    }
  }

  const local = generateLocalSpark({
    words,
    rules,
    personaId: b.personaId as AiPersonaId,
  });
  return json({ text: local, source: "local" });
}

export const Route = createFileRoute("/api/spark")({
  server: {
    handlers: {
      POST: handlePost,
    },
  },
});
