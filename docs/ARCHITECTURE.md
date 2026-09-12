# Wordfire Ember Circle — Architecture

## Stack justification

| Layer | Choice | Why |
|-------|--------|-----|
| UI | React 19 + TanStack Start / Router | Existing production app; file routes, SSR shell, Cloudflare Pages deploy. |
| Style | Tailwind v4 + design tokens | Dark ember system already live. |
| Local state | Zustand + `localStorage` (`wordfire-v2`) | Fast offline pass-and-play + archive; no account. |
| Multiplayer | Custom WebRTC full mesh (`P2PRoom`) | Direct peer data channels; zero per-message server cost after connect. |
| Signaling | `/api/rtc` + Neon (PGLite in preview) | Minimal bootstrap only; not a game server. |
| Deploy | Cloudflare Pages (`NITRO_PRESET=cloudflare_pages`) | Static + edge functions for signaling. |

**Why not PeerJS / Trystero / Yjs as the core?**  
The mesh + perfect-negotiation client and seq-ordered turn protocol already match Wordfire's sequential story model better than a general CRDT. Yjs would help concurrent freeform edits; here only one writer holds the turn token. Keeping a small custom protocol avoids CRDT complexity and story divergence from concurrent inserts.

## Trust model

Client-authoritative co-op. Suitable for friends, not cheaters. Anyone can skip; host (or author) may undo; host may soft-kick. Do not use for ranked or economy games.

## Connection lifecycle

```
Create/Join room (code)
  -> register on signaling poll GET /api/rtc
  -> roster reconcile -> dial pairs (lexicographic initiator)
  -> perfect negotiation (polite peer = smaller id)
  -> data channels: "reliable" (ordered game), "state" (ping/unreliable)
  -> hello + request_state / full_state
  -> play: word | skip | undo | end_sentence | finish | react | thinking | kick
  -> leave POST op=leave
```

### Topology

- **Full mesh** among present peers (target 2–12).  
- **Host** = room creator peer id (or first claims host). Host starts the game and may kick.  
- **Failover:** watchdog rebuilds stalled pairs (fresh RTCPeerConnection, ICE restart). Terminal after N attempts; UI surfaces a blocked-network banner (after TURN too).

### ICE / TURN (2.1)

- STUN first (`iceTransportPolicy: all`). Direct host/srflx preferred.
- `GET /api/ice` mints short-lived Cloudflare Realtime TURN credentials (ttl 4h) when `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` are set on Pages. Port 53 URLs are stripped (browsers time out).
- Cost: Cloudflare TURN is $0.05/GB outbound unless bundled with Realtime SFU. Wordfire data channels are words, not media. Do not enable SFU (that would centralize the fire).
- Missing secrets: STUN-only, `{ relay: false }`. Remote rooms still form on friendly NATs.
- Pass-and-play never calls `/api/ice`.

### Signaling

- Ops: poll (join + peers + signals since cursor), signal (offer/answer/ice), leave.  
- Free/public path: app-hosted Neon on Pages. Self-host: set `DATABASE_URL`, run migrations.  
- If signaling is down: pass-and-play still works fully offline; remote cannot form new rooms.

## Data model

### Local session (`GameSession`)

- `players[]`, `words[]`, `turnIndex`, `rules`, `phase`, `seedPrompt?`  
- Archive: `FinishedStory` with wordCount, players, optional theme/seed/stats.

### Online state (`OnlineCampfireState`)

```
hostId, phase, players[{id,name,colorIndex,role?}],
words[], turnIndex, turnPlayerId, rules, pendingTitle, seq,
seedPrompt?, reactions[{wordId,emoji,by}], thinkingByPeerId
```

### Game messages (reliable channel)

| `t` | Purpose |
|-----|---------|
| `hello` | Presence + host claim |
| `full_state` / `request_state` | Snapshot sync / late join |
| `start` | Host lights fire with locked seating |
| `word` | Contribution + next turnPlayerId + seq |
| `skip` / `undo` / `end_sentence` / `finish` | Turn / story tools |
| `react` | Soft emoji on a word |
| `thinking` | Drafting indicator |
| `kick` | Host removes peer from circle (soft) |
| `set_host` / `players` | Roster maintenance |

**Invariant:** only game-mutating events bump `seq`. Presence merges never bump seq (prevents turn desync).

## Turn integrity

1. Authoritative pointer is **`turnPlayerId`**, not seating index alone.  
2. On word accept: append if `word.id` unseen; advance with `nextTurn(players, fromId)`.  
3. Reject stale `seq < local.seq`.  
4. After roster reorder: `normalizeTurn` rebinds index from id.

## Late join / mid-story

1. New peer appears on roster.  
2. Lowest-id connected peer (or host when available) sends `full_state`.  
3. Joiner may sit as **player** (lobby or host invites) or **spectator** if joining while `phase === "playing"` (default spectator until host restarts).  
4. Spectators receive story updates but cannot take turns.

## Persistence & privacy

- Default: Zustand persist in browser storage; stories never required on server.  
- Signaling DB holds ephemeral room peers + SDP/ICE only (not story body).  
- WebRTC may expose peer IPs via ICE (standard browser behavior). Documented in UI copy.  
- Optional AI friends POST the story so far to `/api/spark` when they take a turn (adding an AI friend is the opt-in).

## Edge cases

| Case | Handling |
|------|----------|
| Network flap | Poll retry; ICE restart; watchdog rebuild |
| Peer leaves mid-turn | Roster drop; if turnPlayerId missing, normalize to next seated |
| Simultaneous join | Mesh dials both; hello/full_state converge |
| Glare (double offer) | Perfect negotiation polite rollback |
| Empty / solo | Local allows setup with AI; remote start requires 2+ |
| Signaling cold | First poll retry; local mode unaffected |

## Static hosting

- Client assets: CF Pages.  
- Edge: `/api/rtc`, optional `/api/spark`.  
- PWA: `manifest.webmanifest` + `sw.js` for offline shell of local mode.
