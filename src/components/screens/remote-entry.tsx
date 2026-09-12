import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Link2, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  generateRoomCode,
  loadRemoteNick,
  markAsHost,
  normalizeRoomCode,
  saveRemoteNick,
} from "@/lib/multiplayer/room-code";
import { STORY_SEEDS } from "@/lib/game/seeds";
import { useGameStore } from "@/lib/game/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function RemoteEntryScreen() {
  const navigate = useNavigate();
  const [nick, setNick] = useState(() => loadRemoteNick());
  const [joinCode, setJoinCode] = useState("");
  const seedId = useGameStore((s) => s.seedId);
  const setSeedId = useGameStore((s) => s.setSeedId);

  function goCreate() {
    const name = nick.trim().slice(0, 24);
    if (!name) {
      toast.error("Add a nickname first.");
      return;
    }
    saveRemoteNick(name);
    const code = generateRoomCode();
    markAsHost(code);
    void navigate({
      to: "/room/$code",
      params: { code },
      search: { n: name },
    });
  }

  function goJoin(e?: React.FormEvent) {
    e?.preventDefault();
    const name = nick.trim().slice(0, 24);
    if (!name) {
      toast.error("Add a nickname first.");
      return;
    }
    const code = normalizeRoomCode(joinCode);
    if (!code) {
      toast.error("That code doesn’t look right.");
      return;
    }
    saveRemoteNick(name);
    void navigate({
      to: "/room/$code",
      params: { code },
      search: { n: name },
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
          <h1 className="font-display text-2xl font-medium tracking-tight">Remote circle</h1>
          <p className="text-sm text-fg-muted">Same story, different devices</p>
        </div>
      </header>

      <div className="mb-6 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4 text-sm leading-relaxed text-fg-muted">
        <p>
          Create a campfire, share the code or link, and take turns from your own phones.
          Connections are peer-to-peer. This site only introduces the circle —
          the story itself is not stored on the server. Peers may see each
          other&apos;s IP addresses while the fire forms.
        </p>
      </div>

      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-fg-subtle">
        Your nickname
      </label>
      <Input
        value={nick}
        onChange={(e) => setNick(e.target.value)}
        placeholder="What should we call you?"
        maxLength={24}
        autoComplete="nickname"
        className="mb-8"
        aria-label="Nickname"
      />

      <section className="mb-6 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
        <div className="mb-3 flex items-center gap-2 text-fg">
          <Radio className="size-4 text-ember-glow" />
          <h2 className="font-medium">Start a remote campfire</h2>
        </div>
        <p className="mb-3 text-sm text-fg-muted">
          You will get a short code, link, and QR to share.
        </p>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
          Optional seed (host)
        </p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {STORY_SEEDS.slice(0, 6).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeedId(s.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                seedId === s.id
                  ? "border-ember/45 bg-ember/15 text-fg"
                  : "border-border text-fg-muted",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Button className="w-full" size="lg" onClick={goCreate}>
          <Users className="size-4" />
          Create room
        </Button>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
        <div className="mb-3 flex items-center gap-2 text-fg">
          <Link2 className="size-4 text-ember-glow" />
          <h2 className="font-medium">Join with a code</h2>
        </div>
        <form onSubmit={goJoin} className="flex flex-col gap-3">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="EMBER-A3F2"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Room code"
            className="font-mono tracking-wider"
          />
          <Button type="submit" variant="secondary" className="w-full" size="lg">
            Join circle
          </Button>
        </form>
      </section>

      <p className="mt-8 text-center text-sm text-fg-subtle">
        Prefer one device?{" "}
        <Link to="/circle" className="text-ember-glow underline-offset-2 hover:underline">
          Pass-and-play instead
        </Link>
      </p>
    </div>
  );
}
