import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  Timer,
  UserMinus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AI_PERSONAS, type AiPersonaId } from "@/lib/ai/personas";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  useGameStore,
} from "@/lib/game/store";
import { STORY_SEEDS } from "@/lib/game/seeds";
import { cn } from "@/lib/utils";

export function SetupScreen() {
  const navigate = useNavigate();
  const players = useGameStore((s) => s.players);
  const draft = useGameStore((s) => s.setupNameDraft);
  const setDraft = useGameStore((s) => s.setSetupNameDraft);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const addAiFriend = useGameStore((s) => s.addAiFriend);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const reorderPlayers = useGameStore((s) => s.reorderPlayers);
  const startGame = useGameStore((s) => s.startGame);
  const rules = useGameStore((s) => s.rules);
  const patchRules = useGameStore((s) => s.patchRules);
  const seedId = useGameStore((s) => s.seedId);
  const setSeedId = useGameStore((s) => s.setSeedId);
  const [showRules, setShowRules] = useState(false);
  const [showAiPicker, setShowAiPicker] = useState(false);
  const [bannedDraft, setBannedDraft] = useState(rules.bannedWords.join(", "));

  const humans = players.filter((p) => p.kind !== "ai").length;
  const ais = players.filter((p) => p.kind === "ai").length;
  const canStart = players.length >= MIN_PLAYERS && humans >= 1;
  const full = players.length >= MAX_PLAYERS;

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    addPlayer();
  }

  function addAi(id: AiPersonaId) {
    if (!addAiFriend(id)) return;
    setShowAiPicker(false);
  }

  function lightFire() {
    if (!startGame()) return;
    void navigate({ to: "/play" });
  }

  function needHint() {
    if (players.length < MIN_PLAYERS) {
      return `Need ${MIN_PLAYERS - players.length} more in the circle`;
    }
    if (humans < 1) return "Add at least one human";
    return null;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back home">
          <Link to="/">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">The circle</h1>
          <p className="text-sm text-fg-muted">
            Humans and AI friends · {MIN_PLAYERS}–{MAX_PLAYERS} seats
          </p>
        </div>
      </header>

      <form onSubmit={submitName} className="mb-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={full ? "Circle is full" : "Human name"}
          maxLength={24}
          disabled={full}
          autoComplete="off"
          autoCapitalize="words"
          aria-label="Player name"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={full || !draft.trim()}
          aria-label="Add player"
        >
          <Plus className="size-4" />
        </Button>
      </form>

      <div className="mb-5">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={full}
          onClick={() => setShowAiPicker((v) => !v)}
          aria-expanded={showAiPicker}
        >
          <Bot className="size-4" />
          Add AI friend
          <Sparkles className="size-3.5 text-ember-glow" />
        </Button>
        {showAiPicker ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AI_PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addAi(p.id)}
                className="rounded-[var(--radius-lg)] border border-border bg-bg-elevated px-3 py-3 text-left transition-colors hover:border-ember/35 hover:bg-ember/5"
              >
                <span className="flex items-center gap-2 font-medium text-fg">
                  <Bot className="size-3.5 text-ember-glow" />
                  {p.name}
                </span>
                <span className="mt-0.5 block text-xs text-fg-muted">{p.blurb}</span>
              </button>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-xs text-fg-subtle">
          Solo with Ember, a full AI cast, or mix friends and sparks — your call.
        </p>
      </div>

      <section className="mb-4 flex-1" aria-label="Players">
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-bg-elevated/50 px-6 py-12 text-center">
            <Users className="mb-3 size-8 text-fg-subtle" />
            <p className="text-sm text-fg-muted">
              Add yourself, then invite AI friends — or fill the circle with people.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-bg-elevated px-3 py-2.5"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums text-ember-fg"
                  style={{
                    backgroundColor: PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length],
                  }}
                >
                  {p.kind === "ai" ? <Bot className="size-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  {p.kind === "ai" ? (
                    <span className="text-xs text-ember-glow/90">AI friend</span>
                  ) : (
                    <span className="text-xs text-fg-subtle">Human</span>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={i === 0}
                    onClick={() => reorderPlayers(i, i - 1)}
                    aria-label={`Move ${p.name} up`}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={i === players.length - 1}
                    onClick={() => reorderPlayers(i, i + 1)}
                    aria-label={`Move ${p.name} down`}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-fg-subtle hover:text-danger"
                    onClick={() => removePlayer(p.id)}
                    aria-label={`Remove ${p.name}`}
                  >
                    <UserMinus className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
          Story seed (optional)
        </p>
        <div className="flex flex-wrap gap-2">
          {STORY_SEEDS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeedId(s.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                seedId === s.id
                  ? "border-ember/45 bg-ember/15 text-fg"
                  : "border-border text-fg-muted hover:border-border-strong",
              )}
              title={s.vibe}
            >
              {s.label}
            </button>
          ))}
        </div>
        {seedId !== "none" ? (
          <p className="mt-2 text-xs text-fg-muted">
            Opens with:{" "}
            <span className="italic text-fg">
              {STORY_SEEDS.find((s) => s.id === seedId)?.prompt}
            </span>
          </p>
        ) : null}
      </section>

      <section className="mb-4 rounded-[var(--radius-xl)] border border-border bg-bg-elevated">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setShowRules((v) => !v)}
          aria-expanded={showRules}
        >
          <span className="text-sm font-medium text-fg">Circle rules</span>
          <Badge variant="secondary">
            {rules.mode === "word" ? "One word" : `Phrase ≤${rules.maxTokens}`}
            {rules.turnTimerSeconds > 0 ? ` · ${rules.turnTimerSeconds}s` : ""}
            {rules.noRepeatedWords ? " · no repeats" : ""}
          </Badge>
        </button>
        {showRules ? (
          <div className="space-y-4 border-t border-border px-4 py-4">
            <fieldset>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                Contribution
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <RuleToggle
                  active={rules.mode === "word"}
                  onClick={() => patchRules({ mode: "word" })}
                  label="One word"
                />
                <RuleToggle
                  active={rules.mode === "phrase"}
                  onClick={() => patchRules({ mode: "phrase" })}
                  label="Phrase"
                />
              </div>
              {rules.mode === "phrase" ? (
                <label className="mt-3 flex items-center justify-between gap-3 text-sm text-fg-muted">
                  Max words
                  <select
                    className="h-10 rounded-[var(--radius-sm)] border border-border-strong bg-bg px-3 text-fg"
                    value={rules.maxTokens}
                    onChange={(e) => patchRules({ maxTokens: Number(e.target.value) })}
                  >
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </fieldset>

            <label className="flex items-center justify-between gap-3 text-sm text-fg-muted">
              <span className="flex items-center gap-2">
                <Timer className="size-4" />
                Turn timer
              </span>
              <select
                className="h-10 rounded-[var(--radius-sm)] border border-border-strong bg-bg px-3 text-fg"
                value={rules.turnTimerSeconds}
                onChange={(e) => patchRules({ turnTimerSeconds: Number(e.target.value) })}
              >
                <option value={0}>Off</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
              </select>
            </label>

            <ToggleRow
              label="Allow . ! ?"
              checked={rules.allowPunctuation}
              onChange={(v) => patchRules({ allowPunctuation: v })}
            />
            <ToggleRow
              label="No repeated words"
              checked={Boolean(rules.noRepeatedWords)}
              onChange={(v) => patchRules({ noRepeatedWords: v })}
            />
            <ToggleRow
              label="Kids mode (soft filter)"
              checked={rules.kidsMode}
              onChange={(v) => patchRules({ kidsMode: v })}
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-fg-subtle">
                Extra banned words
              </label>
              <Input
                value={bannedDraft}
                onChange={(e) => setBannedDraft(e.target.value)}
                onBlur={() =>
                  patchRules({
                    bannedWords: bannedDraft
                      .split(/[,;\n]/)
                      .map((w) => w.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
                placeholder="comma, separated"
                aria-label="Banned words"
              />
            </div>
          </div>
        ) : null}
      </section>

      <p className="mb-24 mt-2 text-center text-sm text-fg-subtle">
        Friends on other devices?{" "}
        <Link to="/remote" className="text-ember-glow underline-offset-2 hover:underline">
          Start a remote circle
        </Link>
      </p>

      <footer className="sticky bottom-0 -mx-5 border-t border-border bg-bg/95 px-5 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="mb-3 flex items-center justify-between text-sm text-fg-muted">
          <span>
            {players.length} / {MAX_PLAYERS}
            {ais > 0 ? ` · ${ais} AI` : ""}
            {humans > 0 ? ` · ${humans} human` : ""}
          </span>
          {needHint() ? (
            <Badge variant="secondary">{needHint()}</Badge>
          ) : (
            <Badge variant="default">Ready</Badge>
          )}
        </div>
        <Button size="lg" className="w-full" disabled={!canStart} onClick={lightFire}>
          Light the fire
        </Button>
      </footer>
    </div>
  );
}

function RuleToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-[var(--radius-md)] border text-sm font-medium transition-colors",
        active
          ? "border-ember/40 bg-ember/15 text-fg"
          : "border-border bg-bg text-fg-muted hover:bg-bg-subtle",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
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
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-fg-muted">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 rounded-full border transition-colors",
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
