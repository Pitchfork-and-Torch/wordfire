import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookCheck,
  Check,
  Copy,
  CornerDownLeft,
  Crown,
  Download,
  Eye,
  SkipForward,
  Undo2,
  UserMinus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StoryText } from "@/components/story-text";
import { CampfireScene } from "@/components/atmosphere/campfire-scene";
import { SoundToggle } from "@/components/atmosphere/sound-toggle";
import { QrInvite } from "@/components/qr-invite";
import {
  useGameStore,
  formatStoryText,
  formatDuration,
  computeStoryStats,
  PLAYER_COLORS,
} from "@/lib/game/store";
import { seedById } from "@/lib/game/seeds";
import { downloadStoryCard } from "@/lib/export/story-card";
import { useOnlineCampfire } from "@/lib/multiplayer/use-online-campfire";
import {
  MAX_REMOTE_PLAYERS,
  REACTION_EMOJIS,
} from "@/lib/multiplayer/online-protocol";
import { roomShareUrl } from "@/lib/multiplayer/room-code";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function OnlineRoomScreen({
  code,
  nickname,
  isCreator,
}: {
  code: string;
  nickname: string;
  isCreator: boolean;
}) {
  const camp = useOnlineCampfire({ code, nickname, isCreator });
  const theme = useGameStore((s) => s.settings.immersion?.theme ?? "night");
  const reducedMotion = useGameStore((s) => s.settings.accessibility.reducedMotion);
  const rules = useGameStore((s) => s.rules);
  const seedId = useGameStore((s) => s.seedId);
  const [draft, setDraft] = useState("");
  const [firePulse, setFirePulse] = useState(0);
  const [copied, setCopied] = useState(false);

  const [shareUrl, setShareUrl] = useState(() => `/room/${code}`);
  useEffect(() => {
    setShareUrl(roomShareUrl(code));
  }, [code]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        shareUrl.startsWith("http") ? shareUrl : roomShareUrl(code),
      );
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  // Save finished remote stories into local archive once
  useEffect(() => {
    if (camp.state.phase !== "finished" || camp.state.words.length === 0) return;
    const store = useGameStore.getState();
    const already = store.archive.some(
      (a) =>
        a.words.length === camp.state.words.length &&
        a.words[0]?.id === camp.state.words[0]?.id,
    );
    if (already) return;
    const title = camp.state.pendingTitle || "Remote campfire";
    const finishedAt = Date.now();
    const seed = seedById(camp.state.seedId ?? seedId);
    const finished = {
      id: `remote-${code}-${Date.now().toString(36)}`,
      title,
      words: camp.state.words,
      players: camp.state.players.map((p) => ({
        id: p.id,
        name: p.name,
        colorIndex: p.colorIndex,
      })),
      createdAt: camp.state.words[0]?.createdAt ?? Date.now(),
      finishedAt,
      wordCount: camp.state.words.length,
      rules: { mode: camp.state.rules.mode, maxTokens: camp.state.rules.maxTokens },
      favorite: false,
      theme,
      seedId: seed.id !== "none" ? seed.id : undefined,
      seedLabel: seed.id !== "none" ? seed.label : undefined,
      stats: computeStoryStats(camp.state.words, finishedAt),
    };
    useGameStore.setState({
      archive: [finished, ...store.archive].slice(0, 100),
    });
  }, [
    camp.state.phase,
    camp.state.words,
    camp.state.pendingTitle,
    camp.state.players,
    camp.state.rules,
    camp.state.seedId,
    code,
    theme,
    seedId,
  ]);

  function onStart() {
    const seed = seedById(seedId);
    const seedWords = seed.prompt
      ? seed.prompt
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((text) => ({
            id: `seed-${Math.random().toString(36).slice(2, 8)}`,
            text,
            playerId: "seed",
            playerName: "Seed",
            colorIndex: 0,
            endsSentence: false,
            createdAt: Date.now(),
          }))
      : [];
    if (
      !camp.startGame(rules, {
        seedId: seed.id,
        seedPrompt: seed.prompt,
        seedWords,
      })
    ) {
      toast.message("Need at least two people in the circle.");
    }
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!draft.trim()) return;
    const result = camp.addWord(draft);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    setFirePulse((n) => n + 1);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* ignore */
    }
    setDraft("");
  }

  const { state } = camp;
  const linkLabel = camp.rosterCount;

  if (camp.kicked) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="font-display text-2xl text-fg">The circle closed</p>
        <p className="text-sm text-fg-muted">
          The host gently closed this seat. You can start a new campfire anytime.
        </p>
        <Button asChild>
          <Link to="/remote">Back to remote</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/">Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col overflow-hidden px-5 pt-5 sm:px-6">
      <CampfireScene
        theme={theme}
        pulse={firePulse}
        reducedMotion={reducedMotion}
        compact
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent to-bg"
        aria-hidden
      />

      <header className="relative z-10 mb-3 flex shrink-0 items-center justify-between gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Leave room">
          <Link to="/remote">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-col items-center">
          <button
            type="button"
            onClick={copyCode}
            className="font-mono text-sm font-medium tracking-wider text-ember-glow"
            aria-label={`Room code ${code}, copy`}
          >
            {code}
          </button>
          <span className="flex items-center gap-1 text-[11px] text-fg-subtle">
            {camp.joined ? (
              <>
                <Wifi className="size-3" />
                {linkLabel} in room
                {camp.connectedCount < linkLabel
                  ? ` · ${camp.connectedCount} linked`
                  : ""}
              </>
            ) : (
              <>
                <Wifi className="size-3 animate-pulse" />
                Connecting…
              </>
            )}
          </span>
        </div>
        <SoundToggle />
      </header>

      {camp.connectionIssues.length > 0 ? (
        <div
          className="relative z-10 mb-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-fg"
          role="status"
        >
          <WifiOff className="mt-0.5 size-3.5 shrink-0 text-danger" />
          <p>
            Some friends could not open a direct link (network walls happen).
            They can refresh or rejoin with the code.
          </p>
        </div>
      ) : null}

      {state.phase === "lobby" ? (
        <Lobby
          camp={camp}
          shareUrl={shareUrl}
          copied={copied}
          onCopyLink={copyLink}
          onStart={onStart}
          nickname={nickname}
        />
      ) : null}

      {state.phase === "playing" ? (
        <PlayRemote
          camp={camp}
          draft={draft}
          setDraft={setDraft}
          onSubmit={submit}
        />
      ) : null}

      {state.phase === "finished" ? <FinishedRemote camp={camp} code={code} /> : null}
    </div>
  );
}

function Lobby({
  camp,
  shareUrl,
  copied,
  onCopyLink,
  onStart,
  nickname,
}: {
  camp: ReturnType<typeof useOnlineCampfire>;
  shareUrl: string;
  copied: boolean;
  onCopyLink: () => void;
  onStart: () => void;
  nickname: string;
}) {
  const seedId = useGameStore((s) => s.seedId);
  const seed = seedById(seedId);

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <div className="mb-4 rounded-[var(--radius-xl)] border border-border bg-bg-elevated/95 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
          Invite
        </p>
        <p className="mt-1 break-all font-mono text-xs text-fg-muted">{shareUrl}</p>
        <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Button className="flex-1" variant="secondary" onClick={onCopyLink}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy invite link"}
          </Button>
          {shareUrl.startsWith("http") ? (
            <QrInvite url={shareUrl} className="mx-auto sm:mx-0" />
          ) : null}
        </div>
        {seed.id !== "none" ? (
          <p className="mt-3 text-xs text-fg-muted">
            Seed: <span className="text-ember-glow">{seed.label}</span> — host
            rules from Settings / this device.
          </p>
        ) : null}
      </div>

      <section className="mb-4 flex-1 rounded-[var(--radius-xl)] border border-border bg-bg-elevated/95 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium tracking-tight">
            Around the fire
          </h2>
          <Badge variant="secondary">
            {camp.state.players.length} / {MAX_REMOTE_PLAYERS}
          </Badge>
        </div>
        <ul className="flex flex-col gap-2">
          {camp.state.players.map((p) => {
            const peer = camp.peers.find((x) => x.id === p.id);
            const isSelf = p.id === camp.selfId;
            const connected =
              isSelf || !peer || peer.connectionState === "connected";
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2.5"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-ember-fg"
                  style={{
                    backgroundColor: PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length],
                  }}
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.name}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {isSelf
                      ? "Here"
                      : peer
                        ? peer.connectionState === "connected"
                          ? peer.rttMs != null
                            ? `Linked · ${Math.round(peer.rttMs)}ms`
                            : "Linked"
                          : peer.connectionState
                        : "Joining…"}
                  </p>
                </div>
                {p.id === camp.state.hostId ? (
                  <span title="Host" className="text-ember-glow">
                    <Crown className="size-4" aria-label="Host" />
                  </span>
                ) : null}
                {!isSelf && !connected ? (
                  <WifiOff className="size-3.5 text-fg-subtle" aria-hidden />
                ) : null}
                {camp.isHost && !isSelf ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={`Gently remove ${p.name}`}
                    onClick={() => camp.kickPlayer(p.id)}
                  >
                    <UserMinus className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {camp.state.players.length < 2 ? (
          <p className="mt-4 text-center text-sm text-fg-muted">
            Waiting for at least one friend… Share the link, {nickname}.
          </p>
        ) : null}
      </section>

      {camp.isHost ? (
        <Button
          size="lg"
          className="w-full"
          disabled={camp.state.players.length < 2}
          onClick={onStart}
        >
          Light the fire
        </Button>
      ) : (
        <p className="py-3 text-center text-sm text-fg-muted">
          Waiting for the host to start…
        </p>
      )}
    </div>
  );
}

function PlayRemote({
  camp,
  draft,
  setDraft,
  onSubmit,
}: {
  camp: ReturnType<typeof useOnlineCampfire>;
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
}) {
  const { state, currentPlayer, isMyTurn, isSpectator } = camp;
  const rules = state.rules;
  const accent =
    PLAYER_COLORS[(currentPlayer?.colorIndex ?? 0) % PLAYER_COLORS.length];
  const thinkingOthers = (state.thinking ?? []).filter((id) => id !== camp.selfId);
  const thinkingNow =
    thinkingOthers.includes(state.turnPlayerId) ||
    (isMyTurn === false &&
      currentPlayer &&
      thinkingOthers.includes(currentPlayer.id));
  const lastWord = state.words[state.words.length - 1];
  const thinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onDraftChange(value: string) {
    setDraft(value);
    if (!isMyTurn) return;
    camp.setThinking(value.trim().length > 0);
    if (thinkTimer.current) clearTimeout(thinkTimer.current);
    if (!value.trim()) {
      camp.setThinking(false);
      return;
    }
    thinkTimer.current = setTimeout(() => {
      /* keep thinking while typing; cleared on submit */
    }, 400);
  }

  useEffect(() => {
    return () => {
      if (thinkTimer.current) clearTimeout(thinkTimer.current);
    };
  }, []);

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      {isSpectator ? (
        <div
          className="mb-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg-elevated/90 px-3 py-2 text-xs text-fg-muted"
          role="status"
        >
          <Eye className="size-3.5 text-ember-glow" />
          You joined mid-story as a spectator. Enjoy the tale; the next fire can
          seat you.
        </div>
      ) : null}

      <div
        className="mb-3 flex items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3"
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
          {(currentPlayer?.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
            {isSpectator
              ? "Spectating"
              : isMyTurn
                ? "Your turn - type below"
                : "Waiting for their word"}
          </p>
          <p className="truncate font-display text-lg font-medium tracking-tight">
            {isMyTurn ? "You" : (currentPlayer?.name ?? "…")}
            {!isMyTurn && currentPlayer ? (
              <span className="ml-2 text-sm font-sans font-normal text-fg-muted">
                {thinkingNow ? "is thinking…" : "is next"}
              </span>
            ) : null}
          </p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {state.words.length}
        </Badge>
      </div>

      <section className="mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-bg-elevated/95">
        <p className="shrink-0 px-5 pt-4 text-xs font-medium uppercase tracking-[0.18em] text-fg-subtle">
          The story so far
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <StoryText words={state.words} large animateLast />
          {lastWord ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-fg-subtle">
                React
              </span>
              {REACTION_EMOJIS.map((emoji) => {
                const count = (state.reactions ?? []).filter(
                  (r) => r.wordId === lastWord.id && r.emoji === emoji,
                ).length;
                const mine = (state.reactions ?? []).some(
                  (r) =>
                    r.wordId === lastWord.id &&
                    r.emoji === emoji &&
                    r.by === camp.selfId,
                );
                return (
                  <button
                    key={emoji}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors",
                      mine
                        ? "border-ember/50 bg-ember/10"
                        : "border-border hover:border-border-strong",
                    )}
                    onClick={() => camp.reactToWord(lastWord.id, emoji)}
                    aria-label={`React ${emoji}`}
                  >
                    <span aria-hidden>{emoji}</span>
                    {count > 0 ? (
                      <span className="tabular-nums text-xs text-fg-muted">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-4 py-2.5">
          {state.players.map((p) => (
            <span
              key={p.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                p.id === currentPlayer?.id
                  ? "border-ember/40 text-fg"
                  : "border-border text-fg-muted",
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length],
                }}
              />
              {p.name}
              {(p.role ?? "player") === "spectator" ? (
                <Eye className="size-3 opacity-70" aria-label="Spectator" />
              ) : null}
              {(state.thinking ?? []).includes(p.id) ? (
                <span className="text-ember-glow">…</span>
              ) : null}
            </span>
          ))}
        </div>
      </section>

      <footer className="shrink-0 border-t border-border bg-bg pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) =>
                onDraftChange(
                  rules.mode === "word"
                    ? e.target.value.replace(/\s/g, "")
                    : e.target.value,
                )
              }
              placeholder={
                isSpectator
                  ? "Spectating this circle"
                  : isMyTurn
                    ? rules.mode === "word"
                      ? "Your word…"
                      : "Your phrase…"
                    : `Waiting for ${currentPlayer?.name ?? "…"}`
              }
              disabled={!isMyTurn}
              maxLength={rules.maxLength}
              autoComplete="off"
              enterKeyHint="send"
              aria-label="Your contribution"
            />
            <Button
              type="submit"
              size="lg"
              className="shrink-0 px-4"
              disabled={!isMyTurn || !draft.trim()}
              aria-label="Say it"
            >
              <CornerDownLeft className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={camp.endSentence}
              disabled={
                isSpectator ||
                state.words.length === 0 ||
                Boolean(state.words[state.words.length - 1]?.endsSentence)
              }
            >
              End sentence
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={camp.skipTurn}
              disabled={isSpectator}
            >
              <SkipForward className="size-4" />
              Skip
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={camp.undoLast}
              disabled={isSpectator || state.words.length === 0}
            >
              <Undo2 className="size-4" />
              Undo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              disabled={isSpectator}
              onClick={() => {
                if (state.words.length < 3) {
                  toast.message("A few more words first.");
                  return;
                }
                camp.finishStory();
              }}
            >
              <BookCheck className="size-4" />
              Finish
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
}

function FinishedRemote({
  camp,
  code,
}: {
  camp: ReturnType<typeof useOnlineCampfire>;
  code: string;
}) {
  const { state } = camp;
  const stats = computeStoryStats(state.words);

  async function share() {
    const text = `"${state.pendingTitle}"\n\n${formatStoryText(state.words)}\n\n- Wordfire Ember Circle · ${state.players.map((p) => p.name).join(", ")} · ${code}`;
    try {
      if (navigator.share) await navigator.share({ title: state.pendingTitle, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied");
      }
    } catch {
      toast.error("Share cancelled");
    }
  }

  async function exportCard() {
    try {
      await downloadStoryCard({
        title: state.pendingTitle || "Remote campfire",
        words: state.words,
        players: state.players.map((p) => p.name),
        seedLabel: seedById(state.seedId).label,
      });
      toast.success("Card saved");
    } catch {
      toast.error("Could not export card");
    }
  }

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <div className="mb-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ember-glow">
          Embers settle
        </p>
        <Input
          value={state.pendingTitle}
          onChange={(e) => camp.setTitle(e.target.value)}
          className="mt-2 border-transparent bg-transparent text-center font-display text-2xl font-medium h-auto py-2"
          aria-label="Story title"
        />
        <p className="mt-1 text-sm text-fg-muted">
          {stats.wordCount} parts · {stats.uniqueContributors} voices ·{" "}
          {formatDuration(stats.durationMs)}
        </p>
        <p className="mt-1 text-sm text-fg-subtle">
          {state.players.map((p) => p.name).join(" · ")}
        </p>
        <p className="mt-2 text-xs text-success">Saved to this device&apos;s archive</p>
      </div>
      <article className="mb-6 flex-1 rounded-[var(--radius-2xl)] border border-border bg-bg-elevated p-6">
        <StoryText words={state.words} large />
      </article>
      <Button className="w-full" onClick={share}>
        Share story
      </Button>
      <Button variant="secondary" className="mt-2 w-full" onClick={exportCard}>
        <Download className="size-4" />
        Export card
      </Button>
      <Button variant="ghost" className="mt-2 w-full" asChild>
        <Link to="/">Home</Link>
      </Button>
      <Button variant="ghost" className="mt-1 w-full text-fg-muted" asChild>
        <Link to="/archive">Open archive</Link>
      </Button>
    </div>
  );
}
