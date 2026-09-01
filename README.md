# Wordfire · Ember Circle (2.1.1)

**Peer-to-peer campfire storytelling. One word at a time.** Grammar is implied — the story belongs to everyone in the circle.

Local pass-and-play on one device, or a remote circle over WebRTC data channels.

[![Live](https://img.shields.io/badge/live-wordfire.jonbailey.xyz-111111)](https://wordfire.jonbailey.xyz/)
[![Version](https://img.shields.io/badge/version-2.1.1-1a1a1a)](https://github.com/Pitchfork-and-Torch/wordfire/releases/latest)


**Live:** https://wordfire.jonbailey.xyz/  
**Codename:** Ember Circle  
**Docs:** [Product](docs/PRODUCT.md) · [Architecture](docs/ARCHITECTURE.md) · [Design](docs/DESIGN.md) · [Testing](docs/TESTING.md) · [Roadmap](docs/ROADMAP.md)

## Stack

- **TanStack Start** (React 19, file routes, Vite)
- **TypeScript** + **Tailwind CSS v4**
- **Zustand** (local session + archive, `wordfire-v2` storage)
- **WebRTC full-mesh P2P** (`/api/rtc` signaling only)
- **Web Audio** procedural ambient (optional)
- **PWA** offline shell for local mode
- Deploy: **Cloudflare Pages** (`NITRO_PRESET=cloudflare_pages`, project `wordfire-jonbailey`)

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run preview
```

Deploy:

```powershell
.\deploy.ps1
```

## Surfaces

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/circle` | Local pass-and-play setup + seeds + rules |
| `/play` | Local live game |
| `/done` | Finish / share / export PNG card / stats |
| `/remote` | Create or join remote room |
| `/room/$code` | Remote lobby (QR + link) + play + reactions |
| `/archive` | Stories on this device |
| `/how` | How it works |
| `/settings` | Atmosphere, sound, a11y, rules |
| `/api/rtc` | WebRTC signaling (edge + Neon) |
| `/api/ice` | Optional short-lived TURN credentials |
| `/api/spark` | Optional AI-friend turn (live model or local word bank) |

## Modes

### Pass-and-play (default)
One device, zero network. Offline-capable via PWA. State in `localStorage` (`wordfire-v2`). Optional AI friends can sit in the circle.

### Remote circle (P2P)
- Create room → memorable code (`EMBER-A3F2`) + shareable `/room/CODE` link + **QR**
- Join with nickname; host starts when 2+ are present
- Story, turn, roster, reactions, thinking indicator over **WebRTC data channels**
- Mid-story joiners sync full history as **spectators**
- Host soft-kick; anyone may skip; undo for author or host
- Cap **12** players (mesh best around 2–8)
- **Deploy note:** remote rooms need Neon `DATABASE_URL` as a Pages secret for `/api/rtc`. Local preview uses PGLite. Optional Through-the-wall relay: Pages secrets `TURN_KEY_ID` + `TURN_KEY_API_TOKEN` (Cloudflare Realtime TURN). Without them, STUN-only.

## Ember Circle highlights

- Optional **story seeds** (fantasy, horror, absurd, …)
- Optional **AI friends** on local circles (Ember, Puck, Lyra, and others)
- **No repeated words** rule (optional)
- **Reactions** on the latest word
- **Thinking** presence while drafting
- **Session stats** (parts, voices, duration)
- **Export PNG** story card
- Local-first archive; guest-first (no accounts)

## Privacy

Guest-first. No accounts. Finished stories stay in this browser unless you export or share them.

Remote rooms use this site only to introduce peers (roster + WebRTC handshake). Story text then goes peer-to-peer. Signaling does not store story text. Peers may learn each other's IP addresses during ICE. An optional TURN relay, when configured, carries the same encrypted data-channel traffic if a direct path fails.

Optional AI friends on a local circle send the story so far to `/api/spark` so they can take a turn. If a live model key is not configured, a local word bank answers.

No analytics or advertising pixels.

## Architecture (pointers)

- Game engine: `src/lib/game/engine.ts`
- Local store: `src/lib/game/store.ts`
- P2P mesh: `src/lib/multiplayer/p2p.ts`
- Signaling: `src/lib/multiplayer/signaling.server.ts`
- Online protocol: `src/lib/multiplayer/online-protocol.ts` + `use-online-campfire.ts`
- Seeds: `src/lib/game/seeds.ts`
- Story card export: `src/lib/export/story-card.ts`
