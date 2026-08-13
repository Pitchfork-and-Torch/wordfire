export type AiPersonaId =
  | "ember"
  | "trickster"
  | "poet"
  | "noir"
  | "sage"
  | "spark";

export interface AiPersona {
  id: AiPersonaId;
  /** Display name in the circle */
  name: string;
  blurb: string;
  /** Soft system flavor for prompts / local style */
  style: string;
  /** Prefer ending sentences more often (0–1) */
  endSentenceBias: number;
  /** Prefer surprising / unusual words */
  wildness: number;
}

export const AI_PERSONAS: AiPersona[] = [
  {
    id: "ember",
    name: "Ember",
    blurb: "Warm, collaborative, keeps the fire kind",
    style: "warm, cooperative, gently advances the plot, family-friendly",
    endSentenceBias: 0.18,
    wildness: 0.2,
  },
  {
    id: "trickster",
    name: "Puck",
    blurb: "Playful curveballs and comic turns",
    style: "mischievous, witty, unexpected but still coherent, light comedy",
    endSentenceBias: 0.12,
    wildness: 0.75,
  },
  {
    id: "poet",
    name: "Lyra",
    blurb: "Lyrical, sensory, a little dreamy",
    style: "poetic, sensory imagery, soft rhythm, evocative without purple prose",
    endSentenceBias: 0.22,
    wildness: 0.45,
  },
  {
    id: "noir",
    name: "Ash",
    blurb: "Shadowy alleys and cool understatement",
    style: "noir, sparse, atmospheric, slightly mysterious, still collaborative",
    endSentenceBias: 0.2,
    wildness: 0.4,
  },
  {
    id: "sage",
    name: "Moss",
    blurb: "Mythic calm and forest wisdom",
    style: "mythic, calm, nature-tinged, wise without lecturing",
    endSentenceBias: 0.25,
    wildness: 0.3,
  },
  {
    id: "spark",
    name: "Spark",
    blurb: "Quick, bright, keeps momentum",
    style: "brisk, clear, plot-forward, energetic, short words",
    endSentenceBias: 0.15,
    wildness: 0.35,
  },
];

export function personaById(id: AiPersonaId | undefined): AiPersona {
  return AI_PERSONAS.find((p) => p.id === id) ?? AI_PERSONAS[0]!;
}

export function nextAiName(existingNames: string[], persona: AiPersona): string {
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!taken.has(persona.name.toLowerCase())) return persona.name;
  for (let i = 2; i <= 8; i++) {
    const n = `${persona.name} ${i}`;
    if (!taken.has(n.toLowerCase())) return n;
  }
  return `${persona.name} ${Math.random().toString(36).slice(2, 5)}`;
}
