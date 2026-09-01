import { createFileRoute } from "@tanstack/react-router";
import { HowToScreen } from "@/components/screens/how-to";

export const Route = createFileRoute("/how")({
  component: HowToScreen,
  head: () => ({
    meta: [
      { title: "How it works · Wordfire" },
      {
        name: "description",
        content:
          "How Wordfire works: one word at a time, on this device or a peer-to-peer remote circle. Optional AI friends on local play.",
      },
    ],
  }),
});
