import { Link } from "@tanstack/react-router";
import { Archive, BookOpen, Flame, Radio, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampfireScene } from "@/components/atmosphere/campfire-scene";
import { SoundToggle } from "@/components/atmosphere/sound-toggle";
import { useGameStore } from "@/lib/game/store";
import { APP_VERSION } from "@/lib/version";

export function HomeScreen() {
  const archive = useGameStore((s) => s.archive);
  const players = useGameStore((s) => s.players);
  const phase = useGameStore((s) => s.phase);
  const theme = useGameStore((s) => s.settings.immersion?.theme ?? "night");
  const reducedMotion = useGameStore((s) => s.settings.accessibility.reducedMotion);
  const hasResume = phase === "playing" && players.length >= 2;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <CampfireScene
        theme={theme}
        reducedMotion={reducedMotion}
        className="absolute inset-0 opacity-90"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/55 to-bg"
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-end gap-1 px-3 pt-4">
        <SoundToggle />
        <Button variant="ghost" size="icon" asChild aria-label="Settings">
          <Link to="/settings">
            <Settings2 className="size-5" />
          </Link>
        </Button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-end px-5 pb-10 pt-8 sm:justify-center sm:px-6">
        <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-ember-glow/90">
            Ember Circle · peer-to-peer · one word at a time
          </p>
          <h1 className="font-display text-4xl font-medium tracking-tight text-fg sm:text-5xl">
            Wordfire
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-fg-muted">
            One word at a time. Grammar is implied — the story belongs to everyone
            in the circle.
          </p>
        </div>

        <div className="flex flex-col gap-3" role="navigation" aria-label="Main">
          {hasResume ? (
            <Button size="lg" className="h-13 w-full text-base" asChild>
              <Link to="/play">
                <Flame className="size-4" />
                Resume campfire
              </Link>
            </Button>
          ) : null}
          <Button
            size="lg"
            className={hasResume ? "w-full" : "h-13 w-full text-base"}
            variant={hasResume ? "secondary" : "default"}
            asChild
          >
            <Link to="/circle">
              <Flame className="size-4" />
              {players.length >= 2 ? "This device" : "Start on this device"}
            </Link>
          </Button>
          <Button size="lg" variant="secondary" className="w-full" asChild>
            <Link to="/remote">
              <Radio className="size-4" />
              Remote circle
            </Link>
          </Button>
          <Button size="lg" variant="secondary" className="w-full" asChild>
            <Link to="/archive">
              <Archive className="size-4" />
              Story archive
              {archive.length > 0 ? (
                <span className="ml-auto tabular-nums text-fg-subtle">{archive.length}</span>
              ) : null}
            </Link>
          </Button>
          <Button size="lg" variant="ghost" className="w-full" asChild>
            <Link to="/how">
              <BookOpen className="size-4" />
              How it works
            </Link>
          </Button>
        </div>

        {players.length > 0 ? (
          <p className="mt-8 text-center text-sm text-fg-subtle">
            Last local circle: {players.map((p) => p.name).join(", ")}
          </p>
        ) : null}
        <p className="mt-8 text-center text-xs text-fg-subtle">
          {APP_VERSION} · guest-first · stories stay in this browser unless you
          share or add an AI friend
        </p>
      </main>
    </div>
  );
}
