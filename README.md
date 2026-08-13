# Wordfire · Ember Circle (2.0)

Pass-and-play and **peer-to-peer** collaborative storytelling. One contribution at a time. Grammar is implied - the story belongs to everyone in the circle.

[![Live](https://img.shields.io/badge/live-wordfire.jonbailey.xyz-111111)](https://wordfire.jonbailey.xyz/)
[![Version](https://img.shields.io/badge/version-2.0.0-1a1a1a)](https://github.com/Pitchfork-and-Torch/wordfire/releases/latest)


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

Deploy (Knock machine):

```powershell
.\deploy.ps1
```

## Surfaces

| Path | Purpose |
|------|---------|
| `/` | Landing (Ember Circle) |
| `/circle` | Local pass-and-play setup + seeds + rules |
| `/play` | Local live game |
| `/done` | Finish / share / export PNG card / stats |
| `/remote` | Create or join remote room |
| `/room/$code` | Remote lobby (QR + link) + play + reactions |
| `/archive` | Stories on this device |
| `/how` | How it works |
| `/settings` | Atmosphere, sound, a11y, rules |
| `/api/rtc` | WebRTC signaling (edge + Neon) |

## Modes

### Pass-and-play (default)
One device, zero network. Offline-capable via PWA. State in `localStorage` (`wordfire-v2`).

### Remote circle (P2P)
- Create room → memorable code (`EMBER-A3F2`) + shareable `/room/CODE` link + **QR**
- Join with nickname; host starts when 2+ are present
- Story, turn, roster, reactions, thinking indicator over **WebRTC data channels**
- Mid-story joiners sync full history as **spectators**
- Host soft-kick; anyone may skip; undo for author or host
- Cap **12** players (mesh best around 2 - 8)
- **Deploy note:** remote rooms need Neon `DATABASE_URL` as Pages secret for `/api/rtc`. Local preview uses PGLite.

## Ember Circle highlights

- Optional **story seeds** (fantasy, horror, absurd, …)
- **No repeated words** rule (optional)
- **Reactions** on the latest word
- **Thinking** presence while drafting
- **Session stats** (parts, voices, duration)
- **Export PNG** story card
- Local-first archive; privacy-first (no required accounts)

## Privacy

Guest-first. Stories private on-device unless shared. Peers may learn each other's IPs during ICE (WebRTC). Signaling does not store story text.

## Architecture (pointers)

- Game engine: `src/lib/game/engine.ts`
- Local store: `src/lib/game/store.ts`
- P2P mesh: `src/lib/multiplayer/p2p.ts`
- Signaling: `src/lib/multiplayer/signaling.server.ts`
- Online protocol: `src/lib/multiplayer/online-protocol.ts` + `use-online-campfire.ts`
- Seeds: `src/lib/game/seeds.ts`
- Story card export: `src/lib/export/story-card.ts`
