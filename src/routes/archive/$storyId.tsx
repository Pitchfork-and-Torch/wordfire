import { createFileRoute } from "@tanstack/react-router";
import { ArchiveDetailScreen } from "@/components/screens/archive";

export const Route = createFileRoute("/archive/$storyId")({
  component: ArchiveStoryPage,
  head: () => ({
    meta: [{ title: "Story · Wordfire" }],
  }),
});

function ArchiveStoryPage() {
  const { storyId } = Route.useParams();
  return <ArchiveDetailScreen storyId={storyId} />;
}
