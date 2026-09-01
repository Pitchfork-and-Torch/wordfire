import { useEffect } from "react";
import { useGameStore } from "@/lib/game/store";

/** Applies accessibility prefs from settings to documentElement */
export function AccessibilityShell({ children }: { children: React.ReactNode }) {
  const a11y = useGameStore((s) => s.settings.accessibility);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("text-large", a11y.largeText);
    root.classList.toggle("contrast-high", a11y.highContrast);
    root.classList.toggle("motion-reduce-pref", a11y.reducedMotion);
    if (a11y.reducedMotion) {
      root.style.setProperty("scroll-behavior", "auto");
    } else {
      root.style.removeProperty("scroll-behavior");
    }
  }, [a11y.largeText, a11y.highContrast, a11y.reducedMotion]);

  return children;
}
