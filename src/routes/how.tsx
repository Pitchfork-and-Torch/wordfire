import { createFileRoute } from "@tanstack/react-router";
import { HowToScreen } from "@/components/screens/how-to";

export const Route = createFileRoute("/how")({
  component: HowToScreen,
  head: () => ({
    meta: [{ title: "How it works · Wordfire" }],
  }),
});
