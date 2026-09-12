import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Gather — this device",
    body: "Add humans around one phone or laptop. Order is turn order. Tweak circle rules if you like.",
  },
  {
    title: "Invite AI friends",
    body: "Add one or many AI companions (Ember, Puck, Lyra…). Solo with sparks works — you need at least one human and two seats total.",
  },
  {
    title: "Or gather remotely",
    body: "Create a room, share the code or link. Friends join from their own devices. Circles try a direct peer-to-peer path first; if the host has a relay configured, it can help when a network wall is in the way. The host lights the fire when ready.",
  },
  {
    title: "Speak one contribution",
    body: "When it’s your turn, add one word (or a short phrase). AI friends speak automatically on their turn.",
  },
  {
    title: "Bank the story",
    body: "Finish when it feels done. Name it, save it, share the chaos.",
  },
];

export function HowToScreen() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-6 sm:px-6">
      <header className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link to="/">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">How it works</h1>
          <p className="text-sm text-fg-muted">Humans, AI friends, one circle</p>
        </div>
      </header>

      <ol className="flex flex-col gap-4">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember/15 font-display text-sm font-semibold tabular-nums text-ember-glow">
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium text-fg">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4">
        <h2 className="font-medium text-fg">The spirit</h2>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">
          No scores. AI friends are optional collaborators, not opponents.
          Finished stories stay in this browser unless you share them. Adding an
          AI friend sends the story so far to this app so they can take a turn.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Button className="w-full" size="lg" asChild>
          <Link to="/circle">This device</Link>
        </Button>
        <Button className="w-full" size="lg" variant="secondary" asChild>
          <Link to="/remote">Remote circle</Link>
        </Button>
      </div>
    </div>
  );
}
