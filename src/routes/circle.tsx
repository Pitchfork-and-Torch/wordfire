import { createFileRoute } from "@tanstack/react-router";
import { SetupScreen } from "@/components/screens/setup";

export const Route = createFileRoute("/circle")({
  component: SetupScreen,
  head: () => ({
    meta: [{ title: "The circle · Wordfire" }],
  }),
});
