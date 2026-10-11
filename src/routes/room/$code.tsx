import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { OnlineRoomScreen } from "@/components/screens/online-room";
import {
  isMarkedHost,
  loadRemoteNick,
  normalizeRoomCode,
  saveRemoteNick,
} from "@/lib/multiplayer/room-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/room/$code")({
  validateSearch: (search: Record<string, unknown>) => ({
    n: typeof search.n === "string" ? search.n.slice(0, 24) : undefined,
  }),
  component: RoomPage,
  head: ({ params }) => ({
    meta: [{ title: `${params.code} · Wordfire` }],
  }),
});

function RoomPage() {
  const { code: raw } = Route.useParams();
  const search = Route.useSearch();
  const code = normalizeRoomCode(raw) ?? "";
  const [nick, setNick] = useState(() => search.n || loadRemoteNick());
  const [ready, setReady] = useState(() => Boolean((search.n || loadRemoteNick()).trim()));

  if (!code) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <p className="text-fg-muted">That room code isn't valid.</p>
        <Button asChild>
          <Link to="/remote">Back</Link>
        </Button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5">
        <h1 className="font-display text-2xl font-medium tracking-tight">Join {code}</h1>
        <p className="mt-2 text-sm text-fg-muted">Pick a nickname for this circle.</p>
        <Input
          className="mt-4"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          maxLength={24}
          placeholder="Nickname"
          autoComplete="nickname"
          aria-label="Nickname"
        />
        <Button
          className="mt-4"
          size="lg"
          disabled={!nick.trim()}
          onClick={() => {
            saveRemoteNick(nick.trim());
            setReady(true);
          }}
        >
          Enter the circle
        </Button>
        <Button variant="ghost" className="mt-2" asChild>
          <Link to="/remote">Cancel</Link>
        </Button>
      </div>
    );
  }

  return (
    <OnlineRoomScreen
      code={code}
      nickname={nick.trim().slice(0, 24)}
      isCreator={isMarkedHost(code)}
    />
  );
}
