import { createFileRoute } from "@tanstack/react-router";
import { mintIceServers } from "@/lib/multiplayer/turn.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

async function handle({ request }: { request: Request }): Promise<Response> {
  if (request.method !== "GET") return json({ error: "method not allowed" }, 405);
  try {
    const payload = await mintIceServers();
    return json(payload);
  } catch (error) {
    console.error("[ice] mint error:", error);
    return json({ iceServers: [], relay: false, error: "ice failed" }, 500);
  }
}

export const Route = createFileRoute("/api/ice")({
  server: { handlers: { GET: handle } },
});
