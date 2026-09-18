/**
 * Fail-closed campfire engine + P2P protocol hygiene. Run:
 *   npx --yes tsx scripts/audit_campfire.ts
 */
import {
  isEnglishContraction,
  sanitizeContribution,
  wordCore,
} from "../src/lib/game/engine.ts";
import { DEFAULT_RULES, type GameRules, type StoryWord } from "../src/lib/game/types.ts";
import {
  applyByeMessage,
  applyHelloMessage,
  applySkipMessage,
  applyStartMessage,
  applyWordMessage,
  dropSeatedPlayer,
  initialOnlineState,
  isStaleGameSeq,
  mergeRoster,
  nextTurn,
  normalizeTurn,
  type OnlineCampfireState,
  type OnlinePlayer,
} from "../src/lib/multiplayer/online-protocol.ts";

let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log("ok ", name);
    return;
  }
  failed += 1;
  console.log("FAIL", name, detail);
}

const phraseNoRepeat: GameRules = {
  ...DEFAULT_RULES,
  mode: "phrase",
  maxTokens: 5,
  noRepeatedWords: true,
};

const kids: GameRules = { ...DEFAULT_RULES, kidsMode: true };

function word(text: string, id = "w"): StoryWord {
  return {
    id,
    text,
    playerId: "p1",
    playerName: "A",
    colorIndex: 0,
    endsSentence: false,
    createdAt: 1,
  };
}

const dup = sanitizeContribution("the the", phraseNoRepeat);
check(
  "phrase no-repeat rejects the the",
  dup.ok === false,
  dup.ok ? "accepted" : dup.reason,
);

const sandwich = sanitizeContribution("the cat the", phraseNoRepeat);
check(
  "phrase no-repeat rejects sandwich repeat",
  sandwich.ok === false,
  sandwich.ok ? "accepted" : sandwich.reason,
);

const okPhrase = sanitizeContribution("the cat sat", phraseNoRepeat);
check("phrase no-repeat allows distinct words", okPhrase.ok === true, okPhrase.ok ? okPhrase.text : okPhrase.reason);

const priorOnce = sanitizeContribution("once", { ...DEFAULT_RULES, noRepeatedWords: true }, [
  word("Once"),
]);
check("no-repeat is case-insensitive vs prior", priorOnce.ok === false);

const hell = sanitizeContribution("hell", kids);
check("kids mode blocks hell", hell.ok === false);

const hellContraction = sanitizeContribution("he'll", kids);
check(
  "kids mode allows he'll",
  hellContraction.ok === true,
  hellContraction.ok ? hellContraction.text : hellContraction.reason,
);

const obfuscated = sanitizeContribution("fu.ck", kids);
check("kids mode still blocks fu.ck", obfuscated.ok === false);

check("he'll is a contraction", isEnglishContraction("he'll"));
check("don't is not ll/ve/re/m contraction", !isEnglishContraction("don't"));
check("wordCore strips he'll to hell", wordCore("he'll") === "hell");

const spaces = sanitizeContribution("two words", DEFAULT_RULES);
check("word mode rejects spaces", spaces.ok === false);

const host: OnlinePlayer = { id: "p-host", name: "Ash", colorIndex: 0, role: "player" };
const gone: OnlinePlayer = { id: "p-gone", name: "Bo", colorIndex: 1, role: "player" };
const stay: OnlinePlayer = { id: "p-stay", name: "Cy", colorIndex: 2, role: "player" };

const afterLeave = mergeRoster(
  "p-host",
  "Ash",
  "p-host",
  [{ id: "p-stay", name: "Cy" }],
  [host, gone, stay],
  "playing",
);
check(
  "leaver is not seated",
  afterLeave.length === 2 && afterLeave.every((p) => p.id !== "p-gone"),
  afterLeave.map((p) => p.id).join(","),
);
check("leaver drop keeps host+stay", afterLeave.some((p) => p.id === "p-host") && afterLeave.some((p) => p.id === "p-stay"));

const token = normalizeTurn(afterLeave, "p-gone", 1);
check(
  "turn token leaves the ghost",
  token.turnPlayerId !== "p-gone" && afterLeave.some((p) => p.id === token.turnPlayerId),
  token.turnPlayerId,
);

const late = mergeRoster(
  "p-host",
  "Ash",
  "p-host",
  [{ id: "p-late", name: "Zed" }],
  [host],
  "playing",
);
check(
  "late join mid-play is spectator",
  late.find((p) => p.id === "p-late")?.role === "spectator",
);

const lobby = mergeRoster(
  "p-host",
  "Ash",
  "p-host",
  [{ id: "p-new", name: "Zed" }],
  [host],
  "lobby",
);
check(
  "lobby join is player",
  lobby.find((p) => p.id === "p-new")?.role === "player",
);

const colored = mergeRoster(
  "p-host",
  "Ash",
  "p-host",
  [{ id: "p-stay", name: "Cy" }],
  [{ ...stay, colorIndex: 7 }, host],
  "playing",
);
check(
  "color survives hang-up of someone else",
  colored.find((p) => p.id === "p-stay")?.colorIndex === 7,
);

const playingWithGhost: OnlineCampfireState = {
  ...initialOnlineState("p-host", host),
  phase: "playing",
  players: [host, gone, stay],
  turnIndex: 1,
  turnPlayerId: "p-gone",
  thinking: ["p-gone"],
  seq: 3,
};
const afterBye = applyByeMessage(playingWithGhost, { t: "bye", playerId: "p-gone" });
check(
  "bye drops ghost seat",
  afterBye.players.length === 2 && afterBye.players.every((p) => p.id !== "p-gone"),
  afterBye.players.map((p) => p.id).join(","),
);
check(
  "bye moves token off ghost",
  afterBye.turnPlayerId !== "p-gone" && afterBye.players.some((p) => p.id === afterBye.turnPlayerId),
  afterBye.turnPlayerId,
);
check("bye clears ghost thinking", !afterBye.thinking.includes("p-gone"));

const hostLeft = dropSeatedPlayer(
  {
    ...initialOnlineState("p-host", host),
    players: [host, stay],
    turnPlayerId: "p-host",
  },
  "p-host",
);
check("host hang-up fails over", hostLeft.hostId === "p-stay" && hostLeft.players.length === 1);

const helloGhost = applyHelloMessage(
  {
    ...initialOnlineState("p-host", host),
    players: [host, stay],
  },
  { t: "hello", player: gone, wantsHost: false },
  {
    selfId: "p-host",
    selfName: "Ash",
    remotePeers: [{ id: "p-stay", name: "Cy" }],
    isCreator: true,
  },
);
check(
  "hello after hang-up does not re-seat",
  helloGhost.players.every((p) => p.id !== "p-gone"),
  helloGhost.players.map((p) => p.id).join(","),
);
const helloLive = applyHelloMessage(
  initialOnlineState("p-host", host),
  { t: "hello", player: stay, wantsHost: false },
  {
    selfId: "p-host",
    selfName: "Ash",
    remotePeers: [{ id: "p-stay", name: "Cy" }],
    isCreator: true,
  },
);
check("hello from live peer seats them", helloLive.players.some((p) => p.id === "p-stay"));

const startGhost = applyStartMessage(
  {
    ...initialOnlineState("p-host", host),
    players: [host, gone, stay],
  },
  {
    t: "start",
    rules: DEFAULT_RULES,
    players: [host, gone, stay],
    hostId: "p-host",
    turnIndex: 1,
    turnPlayerId: "p-gone",
    seq: 1,
  },
  {
    selfId: "p-host",
    selfName: "Ash",
    remotePeers: [{ id: "p-stay", name: "Cy" }],
    isCreator: true,
  },
);
check(
  "start snapshot cannot keep hung-up seat",
  startGhost.players.every((p) => p.id !== "p-gone") && startGhost.players.length === 2,
  startGhost.players.map((p) => p.id).join(","),
);
check(
  "start token leaves the ghost",
  startGhost.turnPlayerId !== "p-gone",
  startGhost.turnPlayerId,
);

const mixed: OnlinePlayer[] = [
  { id: "a", name: "A", colorIndex: 0, role: "player" },
  { id: "b", name: "B", colorIndex: 1, role: "spectator" },
  { id: "c", name: "C", colorIndex: 2, role: "player" },
];
const advanced = nextTurn(mixed, "a");
check("nextTurn skips spectator", advanced.turnPlayerId === "c", advanced.turnPlayerId);

check("equal seq is stale", isStaleGameSeq(5, 5));
check("older seq is stale", isStaleGameSeq(4, 5));
check("newer seq is live", !isStaleGameSeq(6, 5));

const base: OnlineCampfireState = {
  ...initialOnlineState("p-aaa", { id: "p-aaa", name: "A", colorIndex: 0, role: "player" }),
  phase: "playing",
  players: [
    { id: "p-aaa", name: "A", colorIndex: 0, role: "player" },
    { id: "p-bbb", name: "B", colorIndex: 1, role: "player" },
  ],
  turnIndex: 0,
  turnPlayerId: "p-aaa",
  seq: 4,
  thinking: ["p-aaa"],
};

const wordMsg = {
  t: "word" as const,
  word: word("Once", "w-1"),
  turnIndex: 1,
  turnPlayerId: "p-bbb",
  seq: 5,
};
wordMsg.word.playerId = "p-aaa";

const applied = applyWordMessage(base, wordMsg);
check("word seq 5 applies on local 4", applied.seq === 5 && applied.words.length === 1);
check("word advances turn", applied.turnPlayerId === "p-bbb");

const replay = applyWordMessage(applied, wordMsg);
check("duplicate word id does not double", replay.words.length === 1);

const staleWord = applyWordMessage(applied, { ...wordMsg, seq: 5, word: { ...wordMsg.word, id: "w-2", text: "Twice" } });
check("same seq different word is dropped", staleWord.words.length === 1 && staleWord.words[0]?.id === "w-1");

const skipped = applySkipMessage(applied, {
  t: "skip",
  turnIndex: 0,
  turnPlayerId: "p-aaa",
  seq: 6,
});
check("skip seq 6 applies", skipped.seq === 6 && skipped.turnPlayerId === "p-aaa");

const skipAgain = applySkipMessage(skipped, {
  t: "skip",
  turnIndex: 1,
  turnPlayerId: "p-bbb",
  seq: 6,
});
check("equal-seq skip does not double-advance", skipAgain.turnPlayerId === skipped.turnPlayerId && skipAgain.seq === 6);

console.log(failed === 0 ? "AUDIT_CAMPFIRE ok" : `AUDIT_CAMPFIRE failed ${failed}`);
process.exit(failed === 0 ? 0 : 1);
