import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/game/store";
import { cn } from "@/lib/utils";

export function TurnTimer({ onExpire }: { onExpire?: () => void }) {
  const seconds = useGameStore((s) => s.rules.turnTimerSeconds);
  const startedAt = useGameStore((s) => s.turnStartedAt);
  const phase = useGameStore((s) => s.phase);
  const [left, setLeft] = useState(seconds);
  const firedForTurn = useRef<number | null>(null);

  useEffect(() => {
    if (!seconds || phase !== "playing" || !startedAt) {
      setLeft(seconds);
      return;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, seconds - elapsed);
      setLeft(remaining);
      if (remaining === 0 && firedForTurn.current !== startedAt) {
        firedForTurn.current = startedAt;
        onExpire?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [seconds, startedAt, phase, onExpire]);

  if (!seconds || phase !== "playing") return null;

  const urgent = left <= 5;
  return (
    <div
      className={cn(
        "tabular-nums text-xs font-medium tracking-wide",
        urgent ? "text-ember-glow" : "text-fg-subtle",
      )}
      role="timer"
      aria-live="off"
      aria-label={`${left} seconds left on this turn`}
    >
      {left}s
    </div>
  );
}
