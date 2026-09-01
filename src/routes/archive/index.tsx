import { createFileRoute } from "@tanstack/react-router";
import { ArchiveListScreen } from "@/components/screens/archive";

export const Route = createFileRoute("/archive/")({
  component: ArchiveListScreen,
  head: () => ({
    meta: [{ title: "Archive · Wordfire" }],
  }),
});
