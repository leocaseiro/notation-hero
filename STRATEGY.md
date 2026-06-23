---
name: NotationHero
last_updated: 2026-06-11
---

# NotationHero Strategy

## Target problem

Drummers practicing on an electronic kit want three things at once — real-time
"did I play it right?" feedback, the freedom to load the songs they already own,
and a view in standard music notation — but no current tool combines all three.
Apps that nail real-time feedback lock you into a fixed library and show simplified
notation or none, so the intersection a serious drummer actually wants sits empty.

## Our approach

Win by being the integration the incumbents won't build, standing on a proven open
engine: AlphaTab already turns any owned chart (MusicXML / Guitar Pro) into real
drum notation with synced playback, so NotationHero adds real-time scoring,
practice/game/memory modes, and cross-platform delivery (PWA + Capacitor).
Catalog is table stakes — bring-your-own-song + standard notation + Android is
the wedge, and the durable edge is being first in an empty niche, built by someone
who is the target user. This is also a personal AWS / backend-engineering learning
piece, so building it to scale the well-architected way is a first-class goal in
its own right.

## Who it's for

**Primary:** Intermediate hobbyist e-drummer who can already read a little —
practicing their own songs at home on an electronic kit, hiring NotationHero to
drill the specific songs they own with real-time feedback while keeping and
sharpening their standard-notation reading.

**Secondary:** Beginners learning to read while they play, via a falling-notes
on-ramp that fades into real notation.

## Key metrics

- **Return-to-practice rate** — do sessions lead to another within ~7 days? The
  core "does it stick" signal. (PostHog)
- **Own-song load rate** — custom charts loaded/played per active user; proves the
  bring-your-own wedge is real, not just catalog use. (DynamoDB / PostHog)
- **Per-song score improvement** — does a user's best accuracy / star rating on a
  song trend up across sessions? The product working = you get better.
  (DynamoDB score history)

## Tracks

### A · Practice experience

The gameplay heart — real-time scoring and hit feedback, the standard-notation and
falling-notes views, game / practice / memory modes, tempo / loop / section
selection, and latency compensation.

_Why it serves the approach:_ it delivers the three-way combination (feedback +
notation + your song) no other tool assembles.

### B · Song pipeline

Getting any song in — MusicXML / Guitar Pro ingest, the `.mid` → MusicXML
conversion workaround, MIDI-note → notation mapping, and the catalog + own-song
upload path.

_Why it serves the approach:_ it powers the bring-your-own-song wedge and the
format-native bet.

### C · Cross-platform delivery

One web build shipped everywhere — PWA for desktop + Android, Capacitor for iOS
(CoreMIDI), with the Web MIDI input abstraction underneath.

_Why it serves the approach:_ it secures the Android wedge and meets drummers on
whatever device their kit is plugged into.

### D · AWS backend & cloud-scale learning

The scalable, well-architected backend — DynamoDB per-user data, Neon catalog
store, Cognito accounts, cross-device sync — built deliberately to deepen and
showcase AWS / backend skills.

_Why it serves the approach:_ it underpins the catalog/sync edge and is itself a
first-class learning + portfolio goal.

## Not working on

- Native `.mid` import — use the convert-to-MusicXML workaround (MuseScore /
  TuxGuitar) for v1.
- A licensed / major-label song catalog — own-songs + a community/user catalog
  instead.
- Electron / desktop-native builds — the browser/PWA covers desktop for now.
- Optimizing for revenue or competitive defensibility — deliberately deprioritized
  for v1; scale-for-learning is in, monetization and moat are not the driver.

## Marketing

**One-liner:** Practice any song you own — in real drum notation, with real-time
feedback.

**Key message:** The drum trainer that kept what others dropped — bring your own
songs, read real notation, and see every hit scored in real time, on desktop,
iPad, and Android.
