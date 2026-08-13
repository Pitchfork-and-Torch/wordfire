import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_META, type AtmosphereTheme } from "@/lib/game/types";
import { useGameStore } from "@/lib/game/store";
import { cn } from "@/lib/utils";

const THEME_ORDER: AtmosphereTheme[] = ["night", "forest", "cabin", "space", "minimal"];

export function SettingsScreen() {
  const a11y = useGameStore((s) => s.settings.accessibility);
  const immersion = useGameStore((s) => s.settings.immersion);
  const patchSettings = useGameStore((s) => s.patchSettings);
  const rules = useGameStore((s) => s.rules);
  const patchRules = useGameStore((s) => s.patchRules);

  const theme = immersion?.theme ?? "night";
  const soundEnabled = immersion?.soundEnabled ?? false;
  const soundVolume = immersion?.soundVolume ?? 0.35;

  function setImmersion(partial: Partial<NonNullable<typeof immersion>>) {
    patchSettings({
      immersion: {
        theme,
        soundEnabled,
        soundVolume,
        dismissedInstallHint: immersion?.dismissedInstallHint ?? false,
        ...partial,
      },
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-6 sm:px-6">
      <header className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link to="/">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Settings</h1>
          <p className="text-sm text-fg-muted">Atmosphere, comfort, and defaults</p>
        </div>
      </header>

      <section className="mb-8" aria-labelledby="theme-heading">
        <h2
          id="theme-heading"
          className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-subtle"
        >
          Atmosphere
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {THEME_ORDER.map((id) => {
            const meta = THEME_META[id];
            const active = theme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setImmersion({ theme: id })}
                aria-pressed={active}
                className={cn(
                  "rounded-[var(--radius-lg)] border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-ember/45 bg-ember/10"
                    : "border-border bg-bg-elevated hover:border-border-strong",
                )}
              >
                <span className="block text-sm font-medium text-fg">{meta.label}</span>
                <span className="mt-0.5 block text-xs text-fg-muted">{meta.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-8" aria-labelledby="sound-heading">
        <h2
          id="sound-heading"
          className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-subtle"
        >
          Ambient sound
        </h2>
        <div className="space-y-1 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-2">
          <ToggleRow
            label="Crackling fire (off by default)"
            checked={soundEnabled}
            onChange={(v) => setImmersion({ soundEnabled: v })}
          />
          {soundEnabled ? (
            <label className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-fg">
              Volume
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={soundVolume}
                onChange={(e) => setImmersion({ soundVolume: Number(e.target.value) })}
                className="w-32 accent-[var(--color-ember)]"
                aria-label="Ambient volume"
              />
            </label>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-fg-subtle">
          Soft procedural crackle — no downloads. Starts muted until you turn it on.
        </p>
      </section>

      <section className="mb-8" aria-labelledby="a11y-heading">
        <h2
          id="a11y-heading"
          className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-subtle"
        >
          Accessibility
        </h2>
        <div className="space-y-1 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-2">
          <ToggleRow
            label="Larger text"
            checked={a11y.largeText}
            onChange={(v) =>
              patchSettings({ accessibility: { ...a11y, largeText: v } })
            }
          />
          <ToggleRow
            label="Higher contrast"
            checked={a11y.highContrast}
            onChange={(v) =>
              patchSettings({ accessibility: { ...a11y, highContrast: v } })
            }
          />
          <ToggleRow
            label="Reduce motion"
            checked={a11y.reducedMotion}
            onChange={(v) =>
              patchSettings({ accessibility: { ...a11y, reducedMotion: v } })
            }
          />
        </div>
      </section>

      <section className="mb-8" aria-labelledby="defaults-heading">
        <h2
          id="defaults-heading"
          className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-subtle"
        >
          Default circle rules
        </h2>
        <div className="space-y-3 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4">
          <label className="flex items-center justify-between gap-3 text-sm text-fg-muted">
            Mode
            <select
              className="h-10 rounded-[var(--radius-sm)] border border-border-strong bg-bg px-3 text-fg"
              value={rules.mode}
              onChange={(e) =>
                patchRules({ mode: e.target.value as "word" | "phrase" })
              }
            >
              <option value="word">One word</option>
              <option value="phrase">Phrase</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-fg-muted">
            Turn timer
            <select
              className="h-10 rounded-[var(--radius-sm)] border border-border-strong bg-bg px-3 text-fg"
              value={rules.turnTimerSeconds}
              onChange={(e) =>
                patchRules({ turnTimerSeconds: Number(e.target.value) })
              }
            >
              <option value={0}>Off</option>
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={45}>45s</option>
              <option value={60}>60s</option>
            </select>
          </label>
          <ToggleRow
            label="Kids mode"
            checked={rules.kidsMode}
            onChange={(v) => patchRules({ kidsMode: v })}
          />
        </div>
      </section>

      <p className="text-sm text-fg-subtle">
        Stories stay on this device unless you share them. Install as an app for
        offline pass-and-play.
      </p>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] px-3 py-3 text-sm text-fg">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
          checked ? "border-ember/50 bg-ember/30" : "border-border-strong bg-bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-fg transition-transform",
            checked ? "left-6" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}
