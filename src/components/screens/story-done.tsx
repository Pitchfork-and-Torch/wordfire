import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Download, Home, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoryText } from "@/components/story-text";
import { useGameHydrated } from "@/lib/game/hydrate";
import {
  computeStoryStats,
  formatDuration,
  formatStoryMarkdown,
  formatStoryText,
  useGameStore,
} from "@/lib/game/store";
import { downloadStoryCard } from "@/lib/export/story-card";
import { toast } from "sonner";

export function StoryDoneScreen() {
  const navigate = useNavigate();
  const hydrated = useGameHydrated();
  const phase = useGameStore((s) => s.phase);
  const words = useGameStore((s) => s.words);
  const players = useGameStore((s) => s.players);
  const pendingTitle = useGameStore((s) => s.pendingTitle);
  const lastFinished = useGameStore((s) => s.lastFinished);
  const setPendingTitle = useGameStore((s) => s.setPendingTitle);
  const confirmFinish = useGameStore((s) => s.confirmFinish);
  const continueStory = useGameStore((s) => s.continueStory);
  const resetSession = useGameStore((s) => s.resetSession);
  const updateStoryTitle = useGameStore((s) => s.updateStoryTitle);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (phase === "playing" && words.length > 0 && !lastFinished) {
      void navigate({ to: "/play" });
      return;
    }
    if (phase === "idle" && !lastFinished && words.length === 0) {
      void navigate({ to: "/circle" });
    }
  }, [hydrated, phase, lastFinished, words.length, navigate]);

  useEffect(() => {
    if (!hydrated) return;
    if ((phase === "finished" || words.length > 0) && !lastFinished) {
      const story = confirmFinish();
      if (story) setSavedId(story.id);
    } else if (lastFinished) {
      setSavedId(lastFinished.id);
    }
  }, [hydrated, phase, lastFinished, words.length, confirmFinish]);

  const displayTitle = lastFinished?.title ?? pendingTitle;
  const displayWords = lastFinished?.words ?? words;
  const displayPlayers = lastFinished?.players ?? players;
  const stats =
    lastFinished?.stats ??
    (displayWords.length ? computeStoryStats(displayWords, lastFinished?.finishedAt) : null);

  async function share() {
    const title = displayTitle || "Untitled campfire";
    const text = formatStoryMarkdown(
      title,
      displayWords,
      displayPlayers.map((p) => p.name),
    );
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Story copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(formatStoryText(displayWords));
        toast.success("Story copied");
      } catch {
        toast.error("Could not share");
      }
    }
  }

  function copyPlain() {
    void navigator.clipboard.writeText(formatStoryText(displayWords)).then(
      () => toast.success("Plain text copied"),
      () => toast.error("Copy failed"),
    );
  }

  async function exportCard() {
    try {
      await downloadStoryCard({
        title: displayTitle || "Untitled campfire",
        words: displayWords,
        players: displayPlayers.map((p) => p.name),
        seedLabel: lastFinished?.seedLabel,
      });
      toast.success("Card saved");
    } catch {
      toast.error("Could not export card");
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-fg-muted">
        Warming the embers…
      </div>
    );
  }

  if (displayWords.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <p className="text-fg-muted">No finished story yet.</p>
        <Button asChild>
          <Link to="/">Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-8 sm:px-6">
      <div className="mb-6 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-ember-glow">
          Embers settle
        </p>
        <label className="sr-only" htmlFor="story-title">
          Story title
        </label>
        <Input
          id="story-title"
          value={pendingTitle || displayTitle}
          onChange={(e) => setPendingTitle(e.target.value)}
          onBlur={() => {
            if (savedId && pendingTitle.trim()) {
              updateStoryTitle(savedId, pendingTitle);
            }
          }}
          className="border-transparent bg-transparent text-center font-display text-2xl font-medium tracking-tight sm:text-3xl h-auto py-2"
        />
        <p className="mt-2 text-sm text-fg-muted">
          {stats
            ? `${stats.wordCount} parts · ${stats.uniqueContributors} voices · ${formatDuration(stats.durationMs)}`
            : `${displayWords.length} parts`}
        </p>
        <p className="mt-1 text-sm text-fg-subtle">
          {displayPlayers.map((p) => p.name).join(" · ")}
        </p>
        {lastFinished?.seedLabel ? (
          <p className="mt-1 text-xs text-ember-glow/90">Seed: {lastFinished.seedLabel}</p>
        ) : null}
        {savedId ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-success">
            <Check className="size-3.5" />
            Saved to archive
          </p>
        ) : null}
      </div>

      <article className="mb-8 flex-1 rounded-[var(--radius-2xl)] border border-border bg-bg-elevated p-6 shadow-[var(--shadow-card)] sm:p-10">
        <StoryText words={displayWords} large />
      </article>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1" onClick={share}>
          <Share2 className="size-4" />
          Share
        </Button>
        <Button variant="secondary" className="flex-1" onClick={copyPlain}>
          Copy text
        </Button>
      </div>
      <Button variant="outline" className="mt-3 w-full" onClick={exportCard}>
        <Download className="size-4" />
        Export card (PNG)
      </Button>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            continueStory();
            void navigate({ to: "/play" });
          }}
        >
          Keep going
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            resetSession(true);
            void navigate({ to: "/circle" });
          }}
        >
          <RotateCcw className="size-4" />
          New story
        </Button>
      </div>
      <Button variant="ghost" className="mt-3 w-full" asChild>
        <Link to="/">
          <Home className="size-4" />
          Home
        </Link>
      </Button>
      {savedId ? (
        <Button variant="ghost" className="mt-1 w-full text-fg-muted" asChild>
          <Link to="/archive/$storyId" params={{ storyId: savedId }}>
            Open in archive
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
