import { useEffect } from "react";
import { useGameStore } from "@/lib/game/store";
import { THEME_META } from "@/lib/game/types";
import { getAmbientAudio } from "@/lib/immersion/ambient-audio";

/** Applies theme + ambient audio from immersion settings */
export function AtmosphereShell({ children }: { children: React.ReactNode }) {
  const theme = useGameStore((s) => s.settings.immersion?.theme ?? "night");
  const soundEnabled = useGameStore((s) => s.settings.immersion?.soundEnabled ?? false);
  const soundVolume = useGameStore((s) => s.settings.immersion?.soundVolume ?? 0.35);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const meta = THEME_META[theme];
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", meta.themeColor);
  }, [theme]);

  useEffect(() => {
    const ambient = getAmbientAudio();
    ambient.setVolume(soundVolume);
    ambient.setEnabled(soundEnabled);
  }, [soundEnabled, soundVolume]);

  return <>{children}</>;
}
