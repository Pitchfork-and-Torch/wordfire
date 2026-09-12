import { PLAYER_COLORS } from "@/lib/game/store";
import type { StoryWord } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function StoryText({
  words,
  className,
  animateLast = false,
  large = false,
}: {
  words: StoryWord[];
  className?: string;
  animateLast?: boolean;
  large?: boolean;
}) {
  if (words.length === 0) {
    return (
      <p
        className={cn(
          "text-fg-subtle italic",
          large ? "text-xl sm:text-2xl" : "text-base",
          className,
        )}
      >
        The circle is quiet. Say the first word…
      </p>
    );
  }

  return (
    <p
      className={cn(
        "font-display text-fg leading-snug tracking-tight text-balance",
        large ? "text-2xl sm:text-3xl md:text-4xl" : "text-lg sm:text-xl",
        className,
      )}
      aria-live="polite"
      aria-relevant="additions"
    >
      {words.map((w, i) => {
        const color = PLAYER_COLORS[w.colorIndex % PLAYER_COLORS.length];
        const isLast = i === words.length - 1;
        const next = words[i + 1];
        const spaceAfter = next && !/^[.!?,;:…]/.test(next.text);
        return (
          <span key={w.id}>
            <span
              className={cn("story-word", animateLast && isLast && "story-word-enter")}
              style={{ color }}
              title={`${w.playerName}`}
              data-player={w.playerName}
            >
              {w.text}
            </span>
            {spaceAfter ? " " : null}
          </span>
        );
      })}
    </p>
  );
}
