import { createFileRoute } from "@tanstack/react-router";
import { RemoteEntryScreen } from "@/components/screens/remote-entry";

export const Route = createFileRoute("/remote")({
  component: RemoteEntryScreen,
  head: () => ({
    meta: [{ title: "Remote circle · Wordfire" }],
  }),
});
