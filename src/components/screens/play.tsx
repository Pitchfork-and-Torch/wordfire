import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookCheck,
  Bot,
  CornerDownLeft,
  SkipForward,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StoryText } from "@/components/story-text";
import { TurnTimer } from "@/components/turn-timer";
import { CampfireScene } from "@/components/atmosphere/campfire-scene";
import { SoundToggle } from "@/components/atmosphere/sound-toggle";
import { requestSpark } from "@/lib/ai/spark-client";
import { useGameHydrated } from "@/lib/game/hydrate";
import { isAiPlayer, PLAYER_COLORS, useGameStore } from "@/lib/game/store";
import { playWordChime } from "@/lib/immersion/ambient-audio";
import { toast } from "sonner";

export function PlayScreen() {
  const navigate = useNavigate();
  const hydrated = useGameHydrated();
  const players = useGameStore((s) => s.players);
  const words = useGameStore((s) => s.words);
  const turnIndex = useGameStore((s) => s.turnIndex);
  const phase = useGameStore((s) => s.phase);
  const rules = useGameStore((s) => s.rules);
  const addContribution = useGameStore((s) => s.addContribution);
  const endSentence = useGameStore((s) => s.endSentence);
  const skipTurn = useGameStore((s) => s.skipTurn);
  const undoLast = useGameStore((s) => s.undoLast);
  const beginFinish = useGameStore((s) => s.beginFinish);
  const seenOnboarding = useGameStore((s) => s.settings.seenOnboarding);
  const markOnboardingSeen = useGameStore((s) => s.markOnboardingSeen);
  const theme = useGameStore((s) => s.settings.immersion?.theme ?? "night");
  const soundEnabled = useGameStore((s) => s.settings.immersion?.soundEnabled ?? false);
  const soundVolume = useGameStore((s) => s.settings.immersion?.soundVolume ?? 0.35);
  const reducedMotion = useGameStore((s) => s.settings.accessibility.reducedMotion);

  const [draft, setDraft] = useState("");
  const [firePulse, setFirePulse] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const storyEndRef = useRef<HTMLDivElement>(null);
  const aiBusy = useRef(false);
  const current = players[turnIndex % Math.max(players.length, 1)];
  const currentIsAi = isAiPlayer(current);
  const hasAi = players.some((p) => p.kind === "ai");

  useEffect(() => {
    if (!hydrated) return;
    if (phase === "finished") {
      void navigate({ to: "/done" });
      return;
    }
    if (phase !== "playing" || players.length < 2) {
      void navigate({ to: "/circle" });
    }
  }, [hydrated, phase, players.length, navigate]);

  useEffect(() => {
    if (currentIsAi) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [turnIndex, currentIsAi]);

  useEffect(() => {
    storyEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [words.length]);

  useEffect(() => {
    if (!hydrated) return;
    if (!seenOnboarding && phase === "playing") {
      toast.message(
        hasAi
          ? "Humans and AI friends take turns."
          : "Pass the device after each turn.",
        {
          description: hasAi
            ? "When an AI’s turn comes, they speak on their own."
            : "One contribution, then hand it on.",
          duration: 4500,
        },
      );
      markOnboardingSeen();
    }
  }, [hydrated, seenOnboarding, phase, markOnboardingSeen, hasAi]);

  const celebrateWord = useCallback(() => {
    setFirePulse((n) => n + 1);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* ignore */
    }
    if (soundEnabled && !reducedMotion) {
      playWordChime(soundVolume);
    }
  }, [soundEnabled, reducedMotion, soundVolume]);

  // Auto-play AI turns
  useEffect(() => {
    if (!hydrated || phase !== "playing" || !current || !currentIsAi) {
      setAiThinking(false);
      return;
    }
    if (aiBusy.current) return;

    let cancelled = false;
    aiBusy.current = true;
    setAiThinking(true);

    const delay = reducedMotion ? 200 : 550 + Math.random() * 700;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const snap = useGameStore.getState();
          const actor = snap.players[snap.turnIndex % snap.players.length];
          if (!actor || actor.kind !== "ai" || actor.id !== current.id) return;

          const { text } = await requestSpark({
            words: snap.words,
            rules: snap.rules,
            personaId: actor.aiPersona,
            playerName: actor.name,
          });
          if (cancelled) return;

          const result = useGameStore.getState().addContribution(text);
          if (!result.ok) {
            // rare sanitize miss — skip to avoid stalling
            useGameStore.getState().skipTurn();
            toast.message(`${actor.name} paused`, { description: result.reason });
          } else {
            celebrateWord();
          }
        } catch {
          if (!cancelled) {
            useGameStore.getState().skipTurn();
            toast.message("AI friend needed a moment — turn passed.");
          }
        } finally {
          if (!cancelled) {
            setAiThinking(false);
            aiBusy.current = false;
          }
        }
      })();
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // Don't clear aiBusy if a request is in flight that will finish;
      // only reset if we cancel before the request starts meaningfully
      aiBusy.current = false;
      setAiThinking(false);
    };
  }, [
    hydrated,
    phase,
    current?.id,
    currentIsAi,
    turnIndex,
    words.length,
    reducedMotion,
    celebrateWord,
  ]);

  const onTimerExpire = useCallback(() => {
    if (isAiPlayer(useGameStore.getState().players[useGameStore.getState().turnIndex])) {
      return; // AI handles its own pace
    }
    toast.message("Time’s up — turn passed.");
    skipTurn();
  }, [skipTurn]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (currentIsAi || aiThinking) return;
    if (!draft.trim()) return;
    const result = addContribution(draft);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    celebrateWord();
    setDraft("");
  }

  function submitWithPeriod() {
    if (currentIsAi || aiThinking) return;
    const base = draft.trim().replace(/[.!?…]+$/, "");
    if (!base) {
      toast.message(
        rules.mode === "word"
          ? "Type a word, then close with . ! or ?"
          : "Type your phrase, then close with . ! or ?",
      );
      return;
    }
    const result = addContribution(`${base}.`);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    celebrateWord();
    setDraft("");
  }

  function onFinish() {
    if (words.length < 3) {
      toast.message("A few more words first — let the story warm up.");
      return;
    }
    beginFinish();
    void navigate({ to: "/done" });
  }

  if (!hydrated || !current || players.length < 2 || phase !== "playing") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-fg-muted">
        Gathering the circle…
      </div>
    );
  }

  const accent = PLAYER_COLORS[current.colorIndex % PLAYER_COLORS.length];
  const placeholder = currentIsAi
    ? `${current.name} is thinking…`
    : rules.mode === "word"
      ? `${current.name}'s word…`
      : `${current.name}'s phrase (≤${rules.maxTokens})…`;

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col overflow-hidden px-5 pt-5 sm:px-6">
      <CampfireScene
        theme={theme}
        pulse={firePulse}
        reducedMotion={reducedMotion}
        compact
        className="pointer-events-none absolute inset-x-0 top-0 h-44 opacity-70 sm:h-52"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-transparent via-bg/40 to-bg sm:h-52"
        aria-hidden
      />

      <header className="relative z-10 mb-3 flex shrink-0 items-center justify-between gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Leave to home">
          <Link to="/">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          {!currentIsAi ? <TurnTimer onExpire={onTimerExpire} /> : null}
          <Badge variant="secondary" className="tabular-nums">
            {words.length} {words.length === 1 ? "part" : "parts"}
          </Badge>
          <SoundToggle />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-fg-muted"
          onClick={onFinish}
          disabled={words.length === 0 || aiThinking}
        >
          <BookCheck className="size-4" />
          Finish
        </Button>
      </header>

      <div
        className="relative z-10 mb-4 flex shrink-0 items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3"
        style={{
          borderColor: `color-mix(in oklab, ${accent} 45%, transparent)`,
          background: `color-mix(in oklab, ${accent} 10%, var(--color-bg-elevated))`,
        }}
        role="status"
        aria-live="polite"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-ember-fg"
          style={{ backgroundColor: accent }}
        >
          {currentIsAi ? (
            <Bot className="size-5" />
          ) : (
            current.name.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
            {currentIsAi
              ? aiThinking
                ? "AI friend thinking"
                : "AI friend"
              : "Your turn"}
          </p>
          <p className="truncate font-display text-lg font-medium tracking-tight">
            {current.name}
          </p>
        </div>
        {currentIsAi ? (
          <Sparkles
            className={`size-4 shrink-0 ${aiThinking && !reducedMotion ? "animate-pulse" : ""}`}
            style={{ color: accent }}
            aria-hidden
          />
        ) : (
          <Sparkles className="size-4 shrink-0" style={{ color: accent }} aria-hidden />
        )}
      </div>

      <section
        className="relative z-10 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-bg-elevated/90 shadow-[var(--shadow-card)] backdrop-blur-[2px]"
        aria-label="Story"
      >
        <p className="shrink-0 px-5 pt-5 text-xs font-medium uppercase tracking-[0.18em] text-fg-subtle sm:px-8 sm:pt-8">
          The story so far
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4 sm:px-8">
          <StoryText words={words} large animateLast={!reducedMotion} />
          <div ref={storyEndRef} className="h-4" aria-hidden />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-5 py-3 sm:px-8">
          {players.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-fg-muted"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length],
                }}
              />
              {p.kind === "ai" ? <Bot className="size-3 opacity-70" aria-hidden /> : null}
              {p.name}
            </span>
          ))}
        </div>
      </section>

      <footer className="relative z-10 shrink-0 border-t border-border bg-bg pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) =>
                setDraft(
                  rules.mode === "word"
                    ? e.target.value.replace(/\s/g, "")
                    : e.target.value,
                )
              }
              placeholder={placeholder}
              maxLength={rules.maxLength}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              disabled={currentIsAi || aiThinking}
              aria-label={rules.mode === "word" ? "Your word" : "Your phrase"}
              className="font-medium"
            />
            <Button
              type="submit"
              size="lg"
              className="shrink-0 px-4"
              disabled={currentIsAi || aiThinking || !draft.trim()}
              aria-label="Say it"
            >
              <CornerDownLeft className="size-4" />
              <span className="hidden sm:inline">Say it</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-w-[7rem] flex-1"
              onClick={endSentence}
              disabled={
                currentIsAi ||
                aiThinking ||
                !rules.allowPunctuation ||
                words.length === 0 ||
                Boolean(words[words.length - 1]?.endsSentence)
              }
            >
              End sentence
            </Button>
            {rules.allowPunctuation ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-[7rem] flex-1"
                onClick={submitWithPeriod}
                disabled={currentIsAi || aiThinking}
              >
                + period
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                skipTurn();
                toast.message("Turn skipped");
              }}
              disabled={aiThinking}
              aria-label="Skip turn"
            >
              <SkipForward className="size-4" />
              Skip
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (words.length === 0) return;
                undoLast();
                toast.message("Last part undone");
              }}
              disabled={words.length === 0 || aiThinking}
              aria-label="Undo last contribution"
            >
              <Undo2 className="size-4" />
              Undo
            </Button>
          </div>
          <p className="text-center text-xs text-fg-subtle">
            {currentIsAi
              ? `${current.name} speaks next — sit tight by the fire.`
              : hasAi
                ? "Your turn. AI friends play themselves when it’s theirs."
                : rules.mode === "word"
                  ? "One word. Pass the device after you speak."
                  : `Up to ${rules.maxTokens} words. Pass the device after you speak.`}
          </p>
        </form>
      </footer>
    </div>
  );
}
