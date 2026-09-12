# Wordfire Ember Circle — Testing & Verification Guide

## Automated

```bash
cd ~/wordfire
npm run typecheck
npm run build
npm run lint   # optional
```

Local smoke:

```bash
npm run dev
# open http://127.0.0.1:8080/
node scripts/browser-smoke.mjs http://127.0.0.1:8080/
```

## Local pass-and-play

1. Open app offline (or DevTools offline after first load with SW).  
2. Start on this device → add 2+ names → Light fire.  
3. Enter one word each; undo / skip / end sentence.  
4. Finish → archive → rename / favorite.  
5. Confirm refresh restores session (`wordfire-v2` storage).  

## Remote P2P (happy path)

1. Browser A: Remote circle → nickname → Create room.  
2. Browser B (or second device): Join with code or paste invite link.  
3. Lobby: both names, link state "Linked", QR visible on A.  
4. Host: Light the fire.  
5. Alternate words for 20+ turns; verify story identical on both.  
6. Finish; both see title; archive on each device.  

## Cross-network / multi-device

- Phone on cellular + laptop on Wi-Fi.
- Expect STUN `srflx` or TURN `relay` (`Through the wall` chip). Danger banner only if a peer is terminal after watchdog (even the relay failed).
- `GET /api/ice` is 200 JSON. With secrets: at least one `turn:` URL. Without: `relay: false` STUN-only.
- `npx --yes tsx scripts/audit_turn.ts` must print AUDIT_TURN ok.
- Optional: Chrome + Safari same room.  

## Late join mid-story

1. A+B playing with 10+ words.  
2. C joins via code.  
3. C receives `full_state` (full word list).  
4. C is spectator (no turn) unless host restarts; story still updates live.  

## Disconnect recovery

1. During play, kill tab B or toggle offline 10s then online.  
2. B reopens same room link + nickname.  
3. Expect re-signal, mesh rebuild, full_state catch-up.  
4. Turn pointer still valid (turnPlayerId).  

## Reactions & thinking

1. While not your turn, confirm draft does not submit.  
2. On your turn, type slowly: peers show thinking.  
3. Tap reaction on a word; peers show same emoji chip.  

## Host kick

1. Host removes a guest in lobby or play.  
2. Guest sees leave / home guidance; remaining peers continue.  

## Rules

- Word mode rejects spaces.  
- Phrase mode respects max tokens.  
- noRepeatedWords blocks reuse (case-insensitive core).  
- Kids mode + banned list reject set-aside words.  

## Export

1. Finished story → Export card → PNG downloads.  
2. Copy Markdown / plain text match on-screen body.  

## Accessibility

- Keyboard tab through home → setup → play.  
- Screen reader: turn status `aria-live`.  
- Settings: large text, high contrast, reduced motion.  

## Signaling failure

1. Block `/api/rtc` in DevTools.  
2. Remote create fails gracefully; local pass-and-play still works.  
