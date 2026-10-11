import { createFileRoute } from "@tanstack/react-router";
import { StoryDoneScreen } from "@/components/screens/story-done";

export const Route = createFileRoute("/done")({
  component: StoryDoneScreen,
  head: () => ({
    meta: [{ title: "Story finished · Wordfire" }],
  }),
});
