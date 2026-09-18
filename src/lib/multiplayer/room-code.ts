const WORDS = [
  "EMBER",
  "GLOW",
  "SPARK",
  "MOSS",
  "PINE",
  "STAR",
  "MOON",
  "ASH",
  "OAK",
  "FLAME",
  "CEDAR",
  "WILLOW",
  "RIVER",
  "STONE",
  "NIGHT",
  "DAWN",
];

/** Memorable room codes: WORD-XXXX (fits signaling ID regex). */
export function generateRoomCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]!;
  const tail = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${word}-${tail}`;
}

export function normalizeRoomCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (code.length < 2 || code.length > 64) return null;
  if (!/^[A-Z0-9_-]+$/.test(code)) return null;
  return code;
}

export function roomSharePath(code: string): string {
  return `/room/${encodeURIComponent(code)}`;
}

export function roomShareUrl(code: string): string {
  if (typeof window === "undefined") return roomSharePath(code);
  return `${window.location.origin}${roomSharePath(code)}`;
}

const NICK_KEY = "wordfire-remote-nick";
const HOST_KEY = "wordfire-remote-host";

export function saveRemoteNick(name: string) {
  try {
    sessionStorage.setItem(NICK_KEY, name);
  } catch {
    /* ignore */
  }
}

export function loadRemoteNick(): string {
  try {
    return sessionStorage.getItem(NICK_KEY) ?? "";
  } catch {
    return "";
  }
}

export function markAsHost(code: string) {
  try {
    sessionStorage.setItem(`${HOST_KEY}:${code}`, "1");
  } catch {
    /* ignore */
  }
}

export function isMarkedHost(code: string): boolean {
  try {
    return sessionStorage.getItem(`${HOST_KEY}:${code}`) === "1";
  } catch {
    return false;
  }
}
