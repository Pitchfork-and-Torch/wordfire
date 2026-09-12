import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoryText } from "@/components/story-text";
import { formatStoryMarkdown, formatStoryText, useGameStore } from "@/lib/game/store";
import type { FinishedStory } from "@/lib/game/types";
import { toast } from "sonner";

export function ArchiveListScreen() {
  const archive = useGameStore((s) => s.archive);
  const clearArchive = useGameStore((s) => s.clearArchive);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = archive;
    if (favoritesOnly) list = list.filter((s) => s.favorite);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.players.some((p) => p.name.toLowerCase().includes(q)) ||
          formatStoryText(s.words).toLowerCase().includes(q),
      );
    }
    return list;
  }, [archive, query, favoritesOnly]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link to="/">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-medium tracking-tight">Archive</h1>
          <p className="text-sm text-fg-muted">Stories this circle has told</p>
        </div>
        {archive.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-fg-subtle"
            onClick={() => {
              if (window.confirm("Clear all archived stories on this device?")) {
                clearArchive();
              }
            }}
          >
            Clear
          </Button>
        ) : null}
      </header>

      {archive.length > 0 ? (
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, names, words…"
              className="pl-10"
              aria-label="Search archive"
            />
          </div>
          <Button
            type="button"
            variant={favoritesOnly ? "default" : "secondary"}
            size="icon"
            aria-pressed={favoritesOnly}
            aria-label="Favorites only"
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Star className="size-4" />
          </Button>
        </div>
      ) : null}

      {archive.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border-strong px-6 py-16 text-center">
          <BookOpen className="mb-3 size-8 text-fg-subtle" />
          <p className="text-sm text-fg-muted">
            Finished stories land here. Light a fire and tell one.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/circle">Start a campfire</Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-fg-muted">No stories match.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((story) => (
            <li key={story.id}>
              <Link
                to="/archive/$storyId"
                params={{ storyId: story.id }}
                className="block w-full rounded-[var(--radius-lg)] border border-border bg-bg-elevated px-4 py-4 text-left transition-[border-color,background-color] duration-150 hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-display text-lg font-medium tracking-tight text-fg line-clamp-2">
                    {story.title}
                  </p>
                  {story.favorite ? (
                    <Star className="mt-1 size-4 shrink-0 fill-ember text-ember" aria-label="Favorite" />
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-fg-subtle">
                  {story.wordCount} parts · {story.players.map((p) => p.name).join(", ")} ·{" "}
                  {new Date(story.finishedAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ArchiveDetailScreen({ storyId }: { storyId: string }) {
  const story = useGameStore((s) => s.archive.find((a) => a.id === storyId));
  const deleteStory = useGameStore((s) => s.deleteStory);
  const toggleFavorite = useGameStore((s) => s.toggleFavorite);
  const updateStoryTitle = useGameStore((s) => s.updateStoryTitle);

  if (!story) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <p className="text-fg-muted">Story not found on this device.</p>
        <Button asChild>
          <Link to="/archive">Back to archive</Link>
        </Button>
      </div>
    );
  }

  return <StoryDetail story={story} onDelete={deleteStory} onFavorite={toggleFavorite} onTitle={updateStoryTitle} />;
}

function StoryDetail({
  story,
  onDelete,
  onFavorite,
  onTitle,
}: {
  story: FinishedStory;
  onDelete: (id: string) => void;
  onFavorite: (id: string) => void;
  onTitle: (id: string, title: string) => void;
}) {
  const [title, setTitle] = useState(story.title);

  async function share() {
    const text = formatStoryMarkdown(
      story.title,
      story.words,
      story.players.map((p) => p.name),
    );
    try {
      if (navigator.share) await navigator.share({ title: story.title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied");
      }
    } catch {
      toast.error("Share cancelled");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link to="/archive">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => onTitle(story.id, title)}
            className="h-auto border-transparent bg-transparent px-0 font-display text-xl font-medium tracking-tight"
            aria-label="Story title"
          />
          <p className="text-xs text-fg-muted">
            {story.wordCount} parts · {new Date(story.finishedAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFavorite(story.id)}
          aria-label={story.favorite ? "Unfavorite" : "Favorite"}
          aria-pressed={Boolean(story.favorite)}
        >
          <Star
            className={
              story.favorite ? "size-4 fill-ember text-ember" : "size-4 text-fg-subtle"
            }
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-fg-subtle hover:text-danger"
          onClick={() => {
            if (window.confirm("Delete this story?")) onDelete(story.id);
          }}
          aria-label="Delete story"
        >
          <Trash2 className="size-4" />
        </Button>
      </header>
      <article className="mb-6 rounded-[var(--radius-2xl)] border border-border bg-bg-elevated p-6 sm:p-8">
        <StoryText words={story.words} large />
        <p className="mt-6 border-t border-border pt-4 text-sm text-fg-subtle">
          {story.players.map((p) => p.name).join(" · ")}
        </p>
      </article>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={share}>
          Share
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            void navigator.clipboard.writeText(formatStoryText(story.words)).then(
              () => toast.success("Copied"),
              () => toast.error("Copy failed"),
            );
          }}
        >
          Copy text
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            void navigator.clipboard
              .writeText(
                formatStoryMarkdown(
                  story.title,
                  story.words,
                  story.players.map((p) => p.name),
                ),
              )
              .then(
                () => toast.success("Markdown copied"),
                () => toast.error("Copy failed"),
              );
          }}
        >
          Copy Markdown
        </Button>
      </div>
    </div>
  );
}
