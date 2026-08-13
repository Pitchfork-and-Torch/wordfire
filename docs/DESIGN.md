# Wordfire Ember Circle — UI/UX Design Spec

## Brand

- **Name:** Wordfire  
- **2.0 line:** Ember Circle  
- **Tagline:** One word at a time. Grammar is implied — the story belongs to everyone in the circle.  
- **Tone:** Warm, quiet, communal. Not gamified dopamine chrome.

## Color (night theme tokens)

| Token | Role |
|-------|------|
| `--color-bg` `#0c0a09` | Page void |
| `--color-bg-elevated` | Cards / panels |
| `--color-fg` | Primary text |
| `--color-fg-muted` | Secondary |
| `--color-ember` / `ember-glow` | Accent actions, room codes, focus |
| Player palette | 8 soft hues on words + avatars |

Themes: night, forest, cabin, space, minimal (swap ember family).

## Typography

- **Display / story:** Fraunces (serif) — magical growing prose  
- **UI:** Source Sans 3 — clear mobile chrome  
- Story measure: comfortable, `text-balance`, word color by author  

## Key screens

1. **Home** — Campfire scene, Start on this device, Remote circle, Archive, How  
2. **Circle setup** — Names, optional AI friends, rules, **story seed**  
3. **Local play** — Turn banner, story scroll, input, tools  
4. **Remote entry** — Nickname, create / join code  
5. **Room lobby** — Code, link, **QR**, roster, Light the fire  
6. **Remote play** — Presence chips, thinking, reactions, soft host tools  
7. **Done** — Title, stats, share / copy / **export card**  
8. **Archive** — List + detail  
9. **Settings** — Theme, sound, a11y  

## Interaction principles

- One primary CTA per view (Light the fire / Say it / Share).  
- Turn clarity: "Your turn" vs name "is writing" + thinking pulse.  
- Tap targets ≥ 44px; safe-area footer on mobile.  
- Motion: ember pulse, word enter; honor reduced-motion.  
- Errors: toast + gentle copy (no blame for NAT fails).

## Components (implementation map)

| Component | Path |
|-----------|------|
| Campfire particles | `components/atmosphere/campfire-scene.tsx` |
| Story text | `components/story-text.tsx` |
| QR invite | `components/qr-invite.tsx` |
| Export card | `lib/export/story-card.ts` |
| Online room | `components/screens/online-room.tsx` |

## Animation

- 150–250ms ease on chrome.  
- Story last-word enter class.  
- Fire pulse on successful remote word.  
- No layout thrash on peer list updates (fingerprint peer emits).
