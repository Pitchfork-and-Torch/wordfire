import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/screens/home";

export const Route = createFileRoute("/")({
  component: HomeScreen,
  head: () => ({
    meta: [{ title: "Wordfire" }],
  }),
});
