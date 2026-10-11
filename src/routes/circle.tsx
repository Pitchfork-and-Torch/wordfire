import { createFileRoute } from "@tanstack/react-router";
import { SetupScreen } from "@/components/screens/setup";

export const Route = createFileRoute("/circle")({
  component: SetupScreen,
  head: () => ({
    meta: [
      { title: "The circle · Wordfire" },
      {
        name: "description",
        content:
          "Gather a local Wordfire circle. Pass-and-play on one device, one word at a time. Optional AI friends can sit with you.",
      },
    ],
  }),
});
