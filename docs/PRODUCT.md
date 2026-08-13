# Wordfire 2.0 — Product Vision

**Codename:** **Ember Circle**  
**Live:** https://wordfire.jonbailey.xyz/  
**Source:** `~/wordfire` (TanStack Start + WebRTC mesh)

## Elevator pitch

Wordfire is a digital campfire: friends sit in a circle and build a story **one word at a time**. Grammar is implied; the story belongs to everyone present. Ember Circle is the production-grade evolution — peer-to-peer remote circles, offline pass-and-play, on-device archive, and warm immersion — without turning a pure co-op ritual into a moderated platform.

## Spirit we preserve

- One contribution at a time (word default; optional short phrase).
- No ownership fights: co-op trust model, soft tools only.
- Guest-first, privacy-first: no required accounts, stories stay on-device.
- Beauty and reliability are features.
- Local-first always works; remote upgrades to P2P when friends join.

## What 2.0 / Ember Circle adds

| Pillar | Outcome |
|--------|---------|
| **True P2P** | Full-mesh WebRTC data channels; signaling only for handshake (`/api/rtc` + Neon). |
| **Reliable circle** | Host-assisted seating, turn-by-player-id, seq-ordered game events, late-join full sync, reconnect recovery. |
| **Invite polish** | Memorable codes, share links, QR on lobby, clear presence + link quality. |
| **Story longevity** | Local archive, rename/favorite, plain/Markdown/export card, light session stats. |
| **Optional playfulness** | Theme seeds, no-repeat words, reactions, thinking indicator, soft host kick, spectator late join. |
| **Immersion** | Ember palette, campfire particles, ambient crackle, themes, a11y + reduced motion, PWA. |

## Prioritized feature list

### MVP core (ship-critical)

1. Pass-and-play offline on one device  
2. Remote room create/join with code + link  
3. P2P turn-token word flow that does not diverge  
4. Mid-story history sync for late joiners  
5. Local story archive  
6. Muteable ambient + dark campfire UI  
7. Mobile-first responsive layout  

### Full Ember Circle (this upgrade)

1. Invite QR + stronger lobby presence  
2. Seed / theme prompts at circle start  
3. Optional `noRepeatedWords` rule  
4. Word reactions (peer-synced, non-blocking)  
5. Thinking indicator while typing  
6. Soft host kick + spectator role for late join mid-play  
7. Session stats (word count, contributors, duration)  
8. Export story card (PNG) + Markdown / plain text  
9. Comfortable target 2–12 remote seats (mesh degrades gracefully)  
10. Product docs: architecture, design, testing, roadmap  

### 2.1 Through the Wall

Remote circles try a direct WebRTC path first. If a network wall blocks it, a Cloudflare TURN relay keeps the fire lit. Guest-first: no account required. Pass-and-play still works with zero network.

### Explicitly deferred (roadmap)

- Public discovery / open lobbies  
- Branching story trees  
- Voice notes  
- Competitive scoring or ranked play  
- Mandatory cloud story storage  

## Positioning

Not a chat app. Not a writing IDE. A **ritual**: small circles, one fire, one shared sentence growing in the dark.
