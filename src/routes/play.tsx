import { createFileRoute } from "@tanstack/react-router";
import { PlayScreen } from "@/components/screens/play";

export const Route = createFileRoute("/play")({
  component: PlayScreen,
  head: () => ({
    meta: [{ title: "Campfire · Wordfire" }],
  }),
});
