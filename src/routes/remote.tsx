import { createFileRoute } from "@tanstack/react-router";
import { RemoteEntryScreen } from "@/components/screens/remote-entry";

export const Route = createFileRoute("/remote")({
  component: RemoteEntryScreen,
  head: () => ({
    meta: [
      { title: "Remote circle · Wordfire" },
      {
        name: "description",
        content:
          "Start or join a peer-to-peer Wordfire circle. Room code, link, or QR. Story text travels over WebRTC, not a chat server.",
      },
    ],
  }),
});
