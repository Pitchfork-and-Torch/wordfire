import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/game/store";
import { cn } from "@/lib/utils";

export function SoundToggle({ className }: { className?: string }) {
  const immersion = useGameStore((s) => s.settings.immersion);
  const patchSettings = useGameStore((s) => s.patchSettings);
  const enabled = immersion?.soundEnabled ?? false;
  const volume = immersion?.soundVolume ?? 0.35;

  function toggle() {
    patchSettings({
      immersion: {
        ...immersion,
        theme: immersion?.theme ?? "night",
        soundVolume: immersion?.soundVolume ?? 0.35,
        dismissedInstallHint: immersion?.dismissedInstallHint ?? false,
        soundEnabled: !enabled,
      },
    });
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={enabled ? "Mute ambient sound" : "Enable ambient sound"}
      >
        {enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </Button>
      {enabled ? (
        <label className="sr-only" htmlFor="ambient-vol">
          Ambient volume
        </label>
      ) : null}
      {enabled ? (
        <input
          id="ambient-vol"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) =>
            patchSettings({
              immersion: {
                theme: immersion?.theme ?? "night",
                soundEnabled: true,
                dismissedInstallHint: immersion?.dismissedInstallHint ?? false,
                soundVolume: Number(e.target.value),
              },
            })
          }
          className="h-1 w-16 accent-[var(--color-ember)]"
          aria-label="Ambient volume"
        />
      ) : null}
    </div>
  );
}
