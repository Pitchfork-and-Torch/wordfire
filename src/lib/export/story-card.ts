import { formatStoryText } from "@/lib/game/engine";
import type { StoryWord } from "@/lib/game/types";

/**
 * Draw a shareable 1200x630 campfire story card and return a PNG blob.
 */
export async function renderStoryCardPng(opts: {
  title: string;
  words: StoryWord[];
  players: string[];
  seedLabel?: string;
}): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Background gradient (charcoal -> deep ember)
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0c0a09");
  g.addColorStop(0.55, "#1a100c");
  g.addColorStop(1, "#2a140c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Soft ember glow
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.92, 20, W * 0.5, H * 0.95, 380);
  glow.addColorStop(0, "rgba(224,120,64,0.35)");
  glow.addColorStop(1, "rgba(224,120,64,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Brand
  ctx.fillStyle = "rgba(240,160,96,0.9)";
  ctx.font = "600 22px 'Source Sans 3', system-ui, sans-serif";
  ctx.letterSpacing = "0.18em";
  ctx.fillText("WORDFIRE", 72, 72);
  ctx.letterSpacing = "0";

  // Title
  ctx.fillStyle = "#f5f0eb";
  ctx.font = "500 48px Fraunces, Georgia, serif";
  const title = (opts.title || "Untitled campfire").slice(0, 72);
  wrapText(ctx, title, 72, 140, W - 144, 56, 2);

  // Body
  const body = formatStoryText(opts.words).slice(0, 420);
  ctx.fillStyle = "rgba(245,240,235,0.88)";
  ctx.font = "400 28px Fraunces, Georgia, serif";
  wrapText(ctx, body || "…", 72, 240, W - 144, 40, 6);

  // Footer
  ctx.fillStyle = "rgba(168,159,150,0.95)";
  ctx.font = "400 20px 'Source Sans 3', system-ui, sans-serif";
  const who = opts.players.filter(Boolean).join(" · ") || "A quiet circle";
  const meta = opts.seedLabel ? `${who}  ·  ${opts.seedLabel}` : who;
  ctx.fillText(meta.slice(0, 90), 72, H - 56);
  ctx.fillStyle = "rgba(224,120,64,0.85)";
  ctx.fillText("Ember Circle", W - 72 - ctx.measureText("Ember Circle").width, H - 56);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG encode failed"))),
      "image/png",
    );
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let lines = 0;
  let cy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i]!;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      lines++;
      if (lines >= maxLines) {
        // ellipsis on last drawn line already; stop
        return;
      }
      line = words[i]!;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) {
    const truncated =
      lines === maxLines - 1 && words.length > 0 && ctx.measureText(line).width > maxWidth * 0.95
        ? `${line.slice(0, Math.max(1, line.length - 1))}…`
        : line;
    ctx.fillText(truncated, x, cy);
  }
}

export async function downloadStoryCard(opts: {
  title: string;
  words: StoryWord[];
  players: string[];
  seedLabel?: string;
  filename?: string;
}) {
  const blob = await renderStoryCardPng(opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename ?? `wordfire-${(opts.title || "story").slice(0, 40).replace(/[^\w\-]+/g, "-")}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
