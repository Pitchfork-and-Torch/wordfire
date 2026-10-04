/**
 * Fail-closed TURN URL hygiene. Run:
 *   npx --yes tsx scripts/audit_turn.ts
 */
import {
  iceHasTurn,
  iceCandidateDisposition,
  sanitizeIcePayload,
  stripBrowserBlockedTurnUrls,
  FALLBACK_STUN,
} from "../src/lib/multiplayer/turn-filter.ts";
import { mintIceServers, stunOnlyIce } from "../src/lib/multiplayer/turn.server.ts";

let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log("ok ", name);
    return;
  }
  failed += 1;
  console.log("FAIL", name, detail);
}

const sample = [
  {
    urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"],
  },
  {
    urls: [
      "turn:turn.cloudflare.com:3478?transport=udp",
      "turn:turn.cloudflare.com:53?transport=udp",
      "turn:turn.cloudflare.com:3478?transport=tcp",
      "turn:turn.cloudflare.com:80?transport=tcp",
      "turns:turn.cloudflare.com:5349?transport=tcp",
      "turns:turn.cloudflare.com:443?transport=tcp",
    ],
    username: "u",
    credential: "c",
  },
];

const filtered = stripBrowserBlockedTurnUrls(sample);
const allUrls = filtered.flatMap((s) =>
  Array.isArray(s.urls) ? s.urls : [s.urls],
);
check(
  "drops port 53",
  allUrls.every((u) => !/:53(?:\?|$)/.test(u)),
  allUrls.join(" "),
);
check(
  "keeps 3478/443/80/5349",
  allUrls.some((u) => u.includes(":3478")) &&
    allUrls.some((u) => u.includes(":443")) &&
    allUrls.some((u) => u.includes(":80")) &&
    allUrls.some((u) => u.includes(":5349")),
);
check("still has turn", iceHasTurn(filtered));
check("fallback stun has no turn", !iceHasTurn(FALLBACK_STUN));

const clientPoison = sanitizeIcePayload({
  iceServers: [
    {
      urls: ["turn:turn.cloudflare.com:53?transport=udp"],
      username: "u",
      credential: "c",
    },
  ],
  relay: true,
});
check(
  "client strip drops port-53-only relay",
  clientPoison.iceServers.length === 0 && clientPoison.relay === false,
);

const clientMixed = sanitizeIcePayload({
  iceServers: sample,
  relay: true,
});
check(
  "client strip keeps turn without port 53",
  clientMixed.relay === true &&
    iceHasTurn(clientMixed.iceServers) &&
    clientMixed.iceServers
      .flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]))
      .every((u) => !/:53(?:\?|$)/.test(u)),
);

check("ice from ignored offer drops", iceCandidateDisposition(true, true) === "drop");
check("ice before remote desc buffers", iceCandidateDisposition(false, false) === "buffer");
check("ice with remote desc applies", iceCandidateDisposition(false, true) === "apply");
check("ignored offer never buffers", iceCandidateDisposition(true, false) === "drop");

delete process.env.TURN_KEY_ID;
delete process.env.TURN_KEY_API_TOKEN;

const missing = stunOnlyIce();
check("stun-only relay false", missing.relay === false);

const minted = await mintIceServers(async () => {
  throw new Error("network should not run in audit");
});
check(
  "missing env does not throw",
  minted.relay === false && minted.iceServers.length > 0,
);

console.log(failed === 0 ? "AUDIT_TURN ok" : `AUDIT_TURN failed ${failed}`);
process.exit(failed === 0 ? 0 : 1);
