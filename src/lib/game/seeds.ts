/** Optional story seeds offered at circle creation. Classic mode = no seed. */

export interface StorySeed {
  id: string;
  label: string;
  prompt: string;
  vibe: string;
}

export const STORY_SEEDS: StorySeed[] = [
  {
    id: "none",
    label: "Open fire",
    prompt: "",
    vibe: "No prompt - pure freeform",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    prompt: "Once upon a misted ridge a lantern",
    vibe: "Quests, magic, forests",
  },
  {
    id: "horror",
    label: "Horror",
    prompt: "The house had one light still",
    vibe: "Slow dread, shadows",
  },
  {
    id: "absurd",
    label: "Absurd comedy",
    prompt: "My dentist is a raccoon who",
    vibe: "Surreal jokes",
  },
  {
    id: "romance",
    label: "Romance",
    prompt: "They met again under the same",
    vibe: "Soft hearts",
  },
  {
    id: "scifi",
    label: "Sci-fi",
    prompt: "On the third colony the airlocks",
    vibe: "Stars and systems",
  },
  {
    id: "noir",
    label: "Noir",
    prompt: "Rain stitched the alley where",
    vibe: "Smoke and secrets",
  },
  {
    id: "kids",
    label: "Bedtime",
    prompt: "The little fox packed a tiny",
    vibe: "Gentle adventure",
  },
];

export function seedById(id: string | undefined | null): StorySeed {
  return STORY_SEEDS.find((s) => s.id === id) ?? STORY_SEEDS[0]!;
}
