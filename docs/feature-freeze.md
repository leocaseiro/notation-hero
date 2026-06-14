# NotationHero — Feature Freeze (go / no-go)

> **Status:** 🔒 **LOCKED 2026-06-05** — per-feature milestones frozen (one row open: `H-10` upload policy = TBD). Folded into design-stack.md.
> **Created:** 2026-06-05 · **Owner:** leocaseiro
> **Companions:** [docs/design-stack.md](design-stack.md) · [scope.md](../scope.md) · [docs/aws-learning-map.md](aws-learning-map.md)
> **Fork (Phase 0):** `~/Sites/alphaTabWebsite` (branch `rhythm-game`) — live: https://leocaseiro.github.io/alphaTabWebsite/docs/rhythm-game

Single canonical per-feature go/no-go. Each row has a **Milestone** (your decision), fork-reuse status, effort, AWS candidacy, and a **Status**. Reference any feature by **ID** (e.g. `A-1`, `D-2-a`). Children (`X-n-a`) decompose a parent feature.

> **Process:** (1) you review each row ✓; (2) we review together ✓; (3) **locked 2026-06-05** ✓ → folded into `design-stack.md`. The whole-app `/design-shotgun` UI pass runs **after** this freeze.

## Decisions log

> Locked decisions, newest first. Applied to the rows below.

- **2026-06-10 (H-3 milestone):** `H-3` (DynamoDB single-table + GSI) re-milestoned **Alpha → M1** — follows the 2026-06-09 data-store decision: K v1 deploys zero DynamoDB, and H-3's remaining content (per-user sync + analytics counters) is M1 work. Decided at the K-plan round-2 review walkthrough.

- **2026-06-09 (data store):** **Catalogue store = Neon PostgreSQL + JSONB** (hybrid: typed columns + `data jsonb`). **Not** DynamoDB, **not** MongoDB Atlas. **DynamoDB stays** for per-user data (scores/settings/mappings/sync) + analytics counters. **Lesson ≠ Song** (distinct schemas; Song `parts` later). MongoDB/DocumentDB evaluated and dropped (interview talking-point + optional local-Docker side exercise). Affects `H-3`, `H-11`, `K-1`, `K-3`, `song-schema.md`. See [decisions/2026-06-09-catalogue-store-postgres-neon.md](decisions/2026-06-09-catalogue-store-postgres-neon.md).

- **2026-06-05 (LOCKED):** freeze locked — all rows frozen except `H-10` (upload policy = open, decide before M1). Folded into design-stack.md (pointer + ladder + marker; `tone@^15` dropped).

- **2026-06-05 (review complete):**
  - **Tone.js dropped** — AlphaSynth-only audio/metronome; revisit only at friendly-view or if iPad drift shows up. (Removes `tone@^15` from design-stack.md at fold-in.)
  - **Repeats:** AlphaTab honors written repeats in standard view → `B-4` skipped as a build item; `B-4-a` "expand repeats" (unroll) deferred; the **friendly view (`G`) must handle its own repeats**.
  - **Service Worker offline-shell** added (`H-13`, Beta) — separate from the M1 sync engine (`H-5`).
  - **Memory mode (`E-4`)** resized L→M (layer-opacity toggle + state machine), ✚ spec.
  - **NotationRenderer (`A-7`) → Friendly** (build with the 2nd renderer; not a UI toggle).
  - **Accessibility (`A-6`)** baseline folded into `A-2`/`A-4`; full a11y + color-picker → design-shotgun.
  - **Design-shotgun-gated (visual decisions deferred to the UI pass):** `A-2` feedback colors (blue→green reconcile), `A-6` a11y palette, `F-4` dark mode, per-tier score display, `B-9` timeline-A/B UI.
  - **Upload policy (`H-10`) OPEN** — leaning private/no-share; `B-1` local upload approved.
  - **Scores (`C-5`/`C-6`/`C-7`)** = DynamoDB store (M1 sync) + event-source for `H-6`; **Athena** = SQL over the S3 event lake; **Kafka (`H-12`)** = local replay exercise.
- **2026-06-05 (checkpoint):**
  - **Ladder renumbered (monotonic):** `M3` = enhancements · `M4` = desktop · `M5` = pro-audio (ASIO).
  - **Sync model:** *no per-device sync.* User data = **localStorage in Alpha/Beta**; **cross-device sync = M1** (Cognito User Pools).
  - **Area `K` added (Admin/CMS):** Alpha; hosted admin gated by a **CloudFront Function (Basic Auth)** — no Cognito; produces the shared lesson library (feeds `H-11`).
  - **Competitor-name scrub:** feature names generic; all strategic positioning + reference screenshots moved to private storage (`docs/.private/` + ~~Linear Document~~ <!-- Linear retired 2026-06-11; tracker is now Jira project KAN — see docs/decisions/2026-06-11-tracker-linear-to-jira.md. The "Linear Document" artifact is historical; re-home this private reference under the Jira/KAN equivalent. -->).

---

## Milestone ladder

No "v" labels — SemVer is reserved for real releases. These are planning rungs.

| Rung | Gate (what "done" means) |
|---|---|
| **Alpha / EAP** | PWA rhythm game working + minimum AWS + usable on iPad via the WebMIDI shim (personal dogfood). Fast fork migration. |
| **Beta** | PWA hardened (offline shell) + AWS portfolio depth (analytics + SLOs) + preloaded exercises, pre-public. |
| **Friendly** | Friendly notation view (design-gated). Sits between Beta and M1. |
| **M1** | First native + $2 App Store launch (iPad CoreMIDI bridge, Cognito accounts, cross-device sync, uploads). |
| **M2** | Android native + advanced practice/audio. |
| **M3** | Enhancements / polish (velocity & dynamics, kit diagram, imports, auto-suggest, extra mappings). |
| **M4** | Desktop (Mac/Win PWA polish, Electron, keyboard shortcuts). |
| **M5** | Pro-audio (Windows ASIO/WinMM low-latency). |
| **deferred** | Out of scope for now. |

## Legend

- **Scope:** `R` required (scope.md) · `N` nice-to-have (scope.md) · `A` added (design-stack / doc-review / fork)
- **Fork:** `✓` built · `◑` partial · `📋` planned-only · `✗` none
- **Est:** `XS` <½d · `S` 1-2d · `M` 3-5d · `L` 1-2wk · `XL` 3wk+
- **AWS:** `req` needed · `sug` portfolio candidate · `@M1` = cross-device sync arrives with real accounts
- **Status:** `approved` · `changed` · `reviewed` (open) · `TBD` · `🎨` design-shotgun-gated
- **Ref/Notes:** fork doc refs · `✚` needs own `docs/specs/<feature>.md` · `⚠` caveat · `[...]` = your review note

---

## A. Notation, rendering & feedback

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| A-1 | Standard drum notation render | Render uploaded `.gp`/`.mid` as standard drum notation (AlphaTab SVG) | R | ✓ | M | — | Alpha | approved | FEATURES.md; needs `core.includeNoteBounds=true` |
| A-2 | Real-time hit feedback rings | Perfect/early/late colored ring on noteheads, live | R | ✓ | S | — | Alpha | approved 🎨 | FEATURES.md (blue good / orange early / purple late). ⚠ scope wants green=perfect — colors reconciled at design-shotgun |
| A-2-a | Separate early vs late | Distinguish early (orange) from late (purple) | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x] |
| A-3 | Missed note = no feedback | Missed expected notes show no marker | R | ✓ | XS | — | Alpha | approved | scope §feedback |
| A-4 | Extra/wrong-hit red cross | Red cross at the *actually-hit* staff position | R | ◑ | M | — | Alpha | approved | ✚ spec; brainstorm-before-build (/ce-brainstorm). PERFORMANCE.md (cross-markers.tsx); needs `boundsLookup` `[new: need to get fixed properly. Wortht a hole superpowers:brainstorm to do it]` |
| A-5 | Velocity → ghost-note visual | Lighter feedback for low-velocity (ghost) hits | R | ◑ | S | — | M3 | approved | velocity read in fork |
| A-6 | Accessibility: color+shape+text | Pair feedback color with shape + text/label | A | ◑ | S | — | Alpha (baseline) | approved 🎨 | baseline (distinguishable-w/o-color) folded into A-2/A-4; full a11y + color-picker → design-shotgun `[this is something we can do in Friendly, do we need for notation too, if not, what are the A11Y we need to work on]?` |
| A-7 | NotationRenderer interface | Internal abstraction so a 2nd renderer plugs in | A | ✗ | S | — | Friendly | changed | build WITH the friendly view (not a UI toggle; YAGNI before 2nd renderer) `[Q: what do we need here? a toggle for the UI? ...]` |
| A-8 | Ignore-error drawings (pedal hihat) | Suppress error markers for pedal-hihat prep hits | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x]; relates `D-4` |

## B. Transport & player controls

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| B-1 | Load local song | Upload/open `.gp/.gpx/.gp5/.mid` from device | R | ✓ | S | — | Alpha | approved | local only → no copyright issue. Cloud uploads = `H-10` (policy OPEN, leaning no-share) `[Q: we need to be careful on this one because of copyright licenses...]` |
| B-2 | Transport controls | Play / pause / stop / back-to-start | R | ✓ | XS | — | Alpha | approved | scope §player |
| B-3 | Loop on/off | Loop song/section (off by default) | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x] |
| B-4 | Repeat (written repeats) | Honor the score's written repeats on playback | R | ✓ | — | — | — | changed | covered by AlphaTab in standard view (no build); friendly view handles its own (see `G`). See `B-4-a` `Q: I am confused, what is the difference from A/B loop?` |
| B-4-a | Expand repeats (unroll) | Display repeats unrolled/continuous (Soundslice-style) instead of jumping back | N | ✗ | M | — | deferred | approved | needs AlphaTab-side impl; applies to both views. soundslice.com expand-repeats |
| B-5 | Count-in | Metronome count-in per beat, time-sig aware | R | ✓ | S | — | Alpha | approved | synth-only count-in works (Alpha). ⚠ #2397 = metronome+media bug → bites at backing-track (M2) `[note: bug with metronome + audio/video https://github.com/CoderLine/alphaTab/issues/2397#issuecomment-3974123450]` |
| B-6 | Metronome on/off | Toggle metronome (on by default) | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x] |
| B-7 | Tempo adjust (BPM + %) | Dual-mode tempo/speed control | R | ✓ | XS | — | Alpha | approved | PRACTICE_MODAL_PLAN.md |
| B-8 | Display options | Scale / stretch / layout / cursors / highlight | R | ✓ | XS | sug: DynamoDB sync @M1 | Alpha | approved | IMPLEMENTATION_SUMMARY.md `[Q: ...good candidate for dynamoDB sync. WDYT?` → yes, @M1 |
| B-9 | A/B loop (timeline UI) | Click point A & B; loop a range | R | ◑ | M | — | Friendly | approved 🎨 | basic A/B works via AlphaTab (Alpha); timeline-view UI polish = Friendly `[note: already available in the fork; selection owned by AlphaTab; improve UI w/ friendly-view]` |
| B-10 | Per-instrument volume mixer | Volume per track (drums/guitar/bass) | R | ◑ | M | sug: DynamoDB sync @M1 | Beta | approved | ✚ `mixer-ui`; ⚠ API = `changeTrackVolume`; IMPLEMENTATION_SUMMARY.md `[approved with dynamoDB]` |
| B-10-a | Mute-mine / solo-mine | Solo/mute the player's own instrument | R | ◑ | M | — | Beta | approved | AlphaTab `changeTrackMute`/`changeTrackSolo` exist; mute/solo-mine UX new (classic "Minus Drums" / "Drums Only" convention) `[Q: I'ts already done, isn't?]` → partial |
| B-11 | MIDI instrument selector | Choose drums (default) or keyboard | R | ◑ | S | localStorage; sug: DynamoDB @M1 | Beta | approved | track-display toggles = groundwork; input-instrument selector new `[Q: ...partially, no?` `[approved with dynamoDB]` |
| B-12 | Keyboard shortcuts | Hotkeys play/pause/restart etc | N | ✗ | S | — | M4 | approved | FEATURES.md (shortcuts TODO); desktop-focused |

## C. Scoring, rating, streak & history

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| C-1 | Hit-scoring engine | Timing-window scoring (JS / Web MIDI) | R | ✓ | M | — | Alpha | approved | ⚠ **Sightread scrub** (50/300ms consts + comments); PERFORMANCE.md |
| C-2 | Score % at song end | 0-100 score per play | R | ✓ | XS | — | Alpha | approved 🎨 | FEATURES.md [x]; per-tier display (classical 4-tier: Excellent/Good/OK/Miss) → design-shotgun |
| C-3 | 5-star rating | Map score % → 5 stars | R | ◑ | S | — | Alpha | approved | scope §rating |
| C-4 | In-session streak | Current + longest streak within a play | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x] |
| C-5 | Save score each play | Persist each play's score (local; sync later) | R | ✗ | S | localStorage; sug: DynamoDB @M1 | Beta | approved | event-source for `H-6` analytics; Streams roll-ups @M1 `[approved with dynamoDB. set score with game mode: practice/game/game-memory]` `[Q: SQS/SNS or Kafka here? → analytics path H-6, not storage]` |
| C-6 | Cross-session daily streak | Calendar daily-streak history | N | ✗ | M | sug: DynamoDB (sync @M1) | M2 | approved | scope nice |
| C-7 | Per-session score history | Detailed history per session | N | ✗ | M | sug: DynamoDB (sync @M1) | M2 | approved | scope nice |

## D. MIDI input & mapping

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| D-1 | Web MIDI input + device select | Connect & choose a MIDI input device | R | ✓ | S | — | Alpha | approved | iPad via shim (`I-1`), Android via Chrome (`I-2`) |
| D-1-a | Multi-device warning | Warn when multiple MIDI devices connected | A | ✗ | XS | — | Beta | approved | FEATURES.md TODO |
| D-2 | MIDI mapping (multi-zone) | Map several input notes → one notation note | R | ✓ | S | localStorage; sug: DynamoDB sync @M1 | Alpha | approved | ✚ `midi-mapping-ui`; MIDI_MAPPING_* + IMPLEMENTATION_COMPLETE.md |
| D-2-a | Presets (Yamaha/Roland/Alesis/Full) | Built-in kit presets + Full-kit one-click | R | ✓ | XS | localStorage; sug: DynamoDB @M1 | Alpha | approved | persist last choice in localStorage (Alpha); DynamoDB @M1 `[Q: persist latest choice for local? Nice for dynamoDB too]` → yes |
| D-2-b | Custom mapping + listen mode | Capture MIDI by hitting a pad / manual; save presets | R | ✓ | XS | — | Alpha | approved | IMPLEMENTATION_COMPLETE.md |
| D-2-c | Import/export mappings (JSON) | Share mapping configs as JSON | N | 📋 | S | — | M2 | approved | MIDI_MAPPING_PLAN.md (future) |
| D-2-d | Per-song mapping profiles | Mapping varies per song | N | 📋 | M | sug: DynamoDB sync @M1 | M2 | approved | MIDI_MAPPING docs (future) |
| D-2-e | Velocity-based mappings | Map by soft vs hard hit | N | 📋 | M | — | M3 | approved | MIDI_MAPPING docs (future) |
| D-2-f | Visual drum-kit diagram (mapping) | Kit graphic to assign zones in mapping settings | N | 📋 | L | — | M3 | approved | distinct from play-time `J-6`; MIDI_MAPPING docs |
| D-2-g | Auto-detect e-drum kit | Detect kit/zones from MIDI output | N | ◑ | S | — | M2 | approved | IMPROVEMENTS_SUMMARY.md (`getMidiGroupForNote`) |
| D-3 | Pre-check missing mappings | Analyse song; flag unmapped notes before play | N | ✗ | S | — | M3 | approved | FEATURES.md TODO |
| D-4 | Pedal hi-hat forgiveness | Ignore extra-hit errors but count correct hits | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x]; scope §MIDI |

## E. Practice & Game modes

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| E-1 | Game mode | Lock tempo/A-B/repeat; play start-to-finish | R | ✗ | S | — | Beta | approved | ✚ `game-mode-ux`; scope §Game mode |
| E-2 | Practice mode | Free tempo/A-B/repeat (the non-locked mode) | R | ◑ | S | — | Alpha | approved | PRACTICE_MODAL_PLAN.md |
| E-3 | Auto-speed | Accuracy-gated BPM increase per cycle to target | R | ✓ | S | — | Alpha | approved | **AUTO_BPM.md** — fork-DONE fast win |
| E-4 | Memory mode | Hide notation; reveal on error; fade after perfect hits | R | ✗ | M | — | Beta | approved | ✚ spec; layer-opacity toggle + state machine; brainstorm at build `[How is this large? ... On perfect hit throtle fadeOut, on wrong hit show quick. Wanna brainstorm?]` → resized L→M |
| E-5 | Auto-suggest practice mode | If many errors, suggest slower-tempo practice | N | ✗ | S | — | M3 | approved | FEATURES.md (future) |

## F. Configuration & persistence

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| F-1 | Latency compensation | ±100ms per-device offset slider | R | ✗ | M | localStorage; sug: DynamoDB @M1 | Beta | approved | ✚ `latency-compensation-ui`; PWA→JS / native→bridge (`M1`) |
| F-2 | Configurable timing windows | Set GOOD / PERFECT ms thresholds | R | ✗ | S | — | Beta | approved | FEATURES.md TODO |
| F-3 | Save settings (local) | Persist settings to localStorage / IndexedDB | R | ◑ | S | localStorage; sug: DynamoDB sync @M1 | Alpha | approved | mapping persists; rest TODO `[approved with dynamoDB]` |
| F-4 | Dark mode / theme | Dark theme support | N | ✓ | XS | — | Alpha | approved 🎨 | keep (fork ✓); keep/restyle/skip decided at design-shotgun `[PS: we might skip; brainstorm via design-shotgun first]` |
| F-5 | Preload drawing positions | Precompute note positions for perf | A | ◑ | S | — | Beta | approved | FEATURES.md (vibe-coded, needs review); PERFORMANCE.md |

## G. Friendly notation view  *(rung between Beta & M1)*

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| G-1 | Friendly highway view | Horizontal highway (primary) | N | ✗ | XL | — | Friendly | approved | ✚ `/design-shotgun`; stack-brainstorm §6; PixiJS. ⚠ must handle written repeats itself (AlphaTab does standard view) |
| G-1-a | Vertical falling-notes (alt) | Vertical falling-notes alternate view | N | ✗ | L | — | Friendly | approved | stack-brainstorm §6 (renamed — no competitor names); internal game-mode reference screenshot tracked privately |
| G-2 | Friendly-view feedback | Gem shapes, tendency meter, combo glow, hit-window band | N | ✗ | L | — | Friendly | approved | stack-brainstorm §6; carries full a11y (color+shape+text) per `A-6` |

## H. AWS backend & infra  *(portfolio track — runs parallel; PWA-first unblocks it)*

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| H-1 | Pulumi TS IaC | Provision all AWS as TypeScript code | A | ✗ | M | req: (all) | Alpha | approved | interview multiplier |
| H-2 | Lambda Function URL | Public Lambda (hello-world → API) | A | ✗ | M | req: Lambda | Alpha | approved | JWT-in-handler added with `H-9` |
| H-3 | DynamoDB single-table + GSI | Per-user data (M1 cross-device sync) + analytics counters | A | ✗ | L | req: DynamoDB | M1 | approved | **2026-06-09: lesson catalogue moved to Neon Postgres** (see Decisions log); **2026-06-10: re-milestoned Alpha → M1** — K v1 deploys zero DynamoDB, so the milestone follows the per-user data it now serves; the catalogue-store decision doc is the NoSQL talking-point until then |
| H-4 | S3 + CloudFront + OAC | Host the PWA static bundle | A | ✗ | M | req: S3·CloudFront | Alpha | approved | 1 TB free tier |
| H-5 | Offline-sync engine | RxDB vs Legend-State pull/push handler | A | ✗ | M | — | M1 | approved | the SYNC engine (cross-device = M1). App-shell offline = `H-13`. Spike both `[Q: only client offline? Service Worker too? → H-13]` |
| H-6 | SQS/SNS → S3 → Athena analytics | Usage-event pipeline (queue + data lake) | A | ✗ | L | req: SQS·SNS·S3·Athena | Beta | approved | **richest interview piece**; needs `J-8`. Athena = SQL over the S3 event lake (most-practiced lessons, accuracy trends, funnels) `[Q: Where is Athena? → here]` |
| H-7 | CloudWatch + X-Ray SLOs | SLIs/SLOs, burn-rate alarms, traces | A | ✗ | L | req: CloudWatch·X-Ray | Beta | approved | SRE story |
| H-8 | Sentry client errors | Client JS error tracking | A | ✗ | S | — | Alpha | approved | ⚠ PII masking (doc-review) |
| H-9 | Cognito auth (User Pools) | Hosted UI + PKCE + Google → real accounts | A | ✗ | L | req: Cognito | M1 | approved | enables cross-device sync; ⚠ Capacitor-redirect spike (F-15). (Admin `K-2` uses CloudFront-Function Basic Auth, not Cognito) |
| H-10 | S3 uploads + validation | Pre-signed PUT, magic-byte validate, quarantine, rate-limit | R | ✗ | L | req: S3·Lambda | M1 | TBD (open) | ⚠ **upload policy OPEN** — leaning private-per-user / no public sharing; ToS + DMCA. Admin pipeline reused by `K-1` |
| H-11 | Lesson / song library | Curated lessons (S3 files + **Neon Postgres** metadata + search) | N | ✗ | M | req: S3 · Neon Postgres | Beta | approved | **2026-06-09: metadata store = Neon Postgres+JSONB** (was DynamoDB); produced by area `K` (CMS, Alpha); initial preloaded exercise set in Beta; expand at M1 `[Note: I want a list of exercises preloaded in Beta]` |
| H-12 | Kafka (local Docker) | Queue-vs-log learning, off-AWS | A | ✗ | M | — | deferred | approved | **exercise:** rebuild `H-6` ingestion in Kafka (Redpanda) — consumer groups + offsets + **replay** (vs SQS delete-on-consume). Or Aiven/Confluent free tier `[OK, any suggestion to use Kafka? → this]` |
| H-13 | PWA install + offline shell | Service Worker + manifest (offline app-shell, installable) | A | ✗ | S | — | Beta | approved | offline *app shell* (loads w/o network); separate from the M1 sync engine (`H-5`) |

## I. Native shells & platforms

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| I-1 | iPad via WebMIDI shim | Run the PWA on iPad through WebMIDIAPIShimForiOS | A | ✓ | XS | — | Alpha | approved | ⚠ **personal dogfood only, NOT distributable**; fork uses AlphaSynth → dodges the Array.from bug |
| I-2 | Android via Chrome PWA | Run the PWA on Android Chrome (native Web MIDI) | R | ✓ | XS | — | Alpha | approved | no native bridge needed |
| I-3 | Capacitor iPad + Swift CoreMIDI bridge | Native MIDI plumbing for the iPad shell | R | ✗ | XL | — | M1 | approved | ✚ bridge protocol; enables App Store |
| I-4 | Native scoring + tick-map IPC | Score in Swift; JS↔native sync protocol (<10ms feel) | A | ✗ | XL | — | M1 | approved | ✚; the "native scoring" plumbing |
| I-5 | iOS audio-session interruption | Pause/resume on call / Siri / AirPods | A | ✗ | M | — | M1 | approved | design-stack v1 |
| I-6 | Android Kotlin bridge | Native MIDI for the Android shell | A | ✗ | XL | — | M2 | approved | latency parity |
| I-7 | Desktop PWA polish | Mac/Win Chrome/Edge polished PWA | R | ◑ | M | — | M4 | approved | fork runs on Mac Chrome today; renumbered (enhancements M3 ship before desktop M4) |
| I-8 | Electron wrapper | Desktop app wrapper | N | ✗ | L | — | M4 | approved | if PWA install friction proves real |
| I-9 | Windows ASIO/WinMM bridge | Pro-latency native Windows audio | N | ✗ | XL | — | M5 | approved | may stay deferred |

## J. Media & extras

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| J-1 | Backing-track (MP3) | Play an MP3 alongside | N | ◑ | S | sug: S3 host ~S | M2 | approved | works via AlphaTab (AlphaSynth) — **no Tone.js**; ⚠ metronome/count-in bug #2397 `[already works in AlphaTab; only issue metronome+count-down; don't need Tone.js unless friendly-view]` |
| J-2 | Video (MP4/YouTube) sync | Background video synced to playback | N | ✗ | L | — | M2 | approved | sync to AlphaSynth `playerPositionChanged` clock; no Tone.js; #2397 caveat `[same as above]` |
| J-3 | Import alphaTex / .midi | Import via AlphaTab alphaTex or raw `.midi` | N | ✗ | M | — | M3 | approved | `[Note: use AlphaTab alphaTex https://alphatab.net/docs/alphatex/introduction]` (also authors `K`/`H-11` exercises) |
| J-4 | Share results (PDF/CSV) | Export score/results | N | ✗ | S | sug: Lambda gen ~S | deferred | approved | FEATURES.md (future) |
| J-5 | Ghost-note dynamics detect + chart | Detect dynamics; classical dynamics chart | N | ✗ | L | — | M3 | approved | scope nice (dynamic detection) |
| J-6 | Drumkit SVG (play-time) | Live kit visualization — lights up struck pads; shown in notation + friendly views | N | ✗ | L | — | M3 | approved | **distinct from `D-2-f`** (mapping diagram); internal-reference style (see private design library) `[show in both views]` |
| J-7 | Mobile phone support | Small-screen redesign | N | ✗ | XL | — | deferred | approved | phone = its own project |
| J-8 | Analytics instrumentation (client) | Emit usage events to the pipeline | A | ✗ | S | req: feeds `H-6` | Beta | approved | enables `H-6` (and the `H-12` Kafka exercise) |
| J-9 | Discord / social / publishing | Community + alternate.to listings | N | ✗ | XS | — | deferred | approved | ops, not app |

## K. Admin / CMS (lesson management)  *(producer side of the shared-lesson model)*

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| K-1 | Lesson store (files + catalog) | Store + validate lesson files and metadata | A | ✗ | M | req: S3 · **Neon Postgres** · Lambda(validate) | Alpha | approved | **catalogue metadata = Neon Postgres+JSONB** (2026-06-09, was DynamoDB); shared content (no identity); feeds `H-11`; admin-curated → sidesteps `B-1`/`H-10` copyright |
| K-2 | Hosted admin SPA + CRUD | Manage/upload lessons; htpasswd-style gate | A | ✗ | M | req: S3 · CloudFront · CloudFront Function (Basic Auth) · Lambda FURL | Alpha | approved | **no Cognito**; edge Basic-Auth (rotate = redeploy, HTTPS-only); edge-auth portfolio piece |
| K-3 | Lesson catalog API + delivery | App reads catalog + downloads lesson files | A | ✗ | S | req: Lambda · CloudFront | Alpha | approved | consumed by the app; feeds `H-11`; **Lambda → Neon Postgres** via serverless HTTP driver (store swappable behind this API) |

---

## AWS portfolio candidates (ranked by interview value)

Per the **sync model**: per-user data is localStorage in Alpha/Beta; DynamoDB *cross-device* sync arrives at M1. DynamoDB earns its early place via **analytics counters** (the lesson *catalogue* moved to **Neon Postgres** on 2026-06-09 — see Decisions log).

1. `H-6` Analytics pipeline (SQS/SNS → S3 → Athena) — messaging + data-lake — **L** — *Beta*
2. `H-7` CloudWatch/X-Ray SLOs + burn-rate — SRE/observability — **L** — *Beta*
3. `K-1`/`K-2`/`K-3` Admin CMS — S3 + **Neon Postgres** + Lambda + CloudFront + edge Basic-Auth — **Alpha**
4. `H-3` DynamoDB single-table + GSI (per-user sync @M1 + analytics counters; catalogue → Neon Postgres) — **L** — *M1*
5. `H-1` Pulumi IaC — **M** — *Alpha* · 6. `H-2` Lambda Function URL — **M** — *Alpha* · 7. `H-4` S3 + CloudFront + OAC — **M** — *Alpha*
8. `H-9` Cognito User Pools (OAuth2/PKCE) — unlocks cross-device sync — **L** — *M1* · 9. `H-10` S3 uploads + validation — **L** — *M1*
10. `H-12` Kafka (local) — queue-vs-log + **replay** — **M** — *deferred (learning)*

**Bolt-ons (turn a local feature into an AWS showcase, `@M1` for cross-device):** `F-3` settings · `C-5` scores · `D-2` mappings · `F-1` latency · `B-8` display · `B-10` mixer · `J-4` share → Lambda PDF.

> The entire app **can ship as a pure PWA with zero AWS**. AWS is opt-in per feature, driven by the job-hunt goal.

## Headline moves vs `design-stack.md`

**PWA-first pivot** → native scoring/latency/audio-interruption to **M1** (`I-3`/`I-4`/`I-5`); AWS core **up to Alpha** (`H-1..H-4`), portfolio centerpiece to **Beta** (`H-6`/`H-7`). **Sync model:** no per-device sync — localStorage in Alpha/Beta, cross-device sync at **M1**. **New area `K` (Admin/CMS)** in Alpha = producer of the shared lesson library (CloudFront-Function Basic Auth, no Cognito). **Tone.js dropped** (AlphaSynth-only). **Auto-speed → Alpha**; **memory mode → Beta** (resized M). **Friendly view → its own rung**. **Ladder renumbered:** M3 enhancements / M4 desktop / M5 pro-audio. **Service Worker** offline-shell added (`H-13`, Beta).

## Things to eyeball / for design-shotgun

- 🎨 `A-2` blue→green color reconcile · `A-6` a11y palette + color-picker · `F-4` dark mode · `C-2` per-tier score display · `B-9` timeline-A/B UI — all decided at `/design-shotgun`.
- ⚠ `C-1` Sightread scrub before reuse · `B-10` verify `changeTrackVolume` vs `.d.ts` · `I-1` shim is dogfood-only · `K-2` Basic-Auth HTTPS-only + baked credential · `H-10` upload policy still OPEN.

## Open items (not blocking the lock)

- `H-10` upload policy (private-only vs sharing) — decide before M1.
- `/design-shotgun` whole-app UI pass — runs after this freeze.
- Per-feature `✚ spec` docs: `A-4`, `D-2`, `E-1`, `E-4`, `F-1`, `B-9`, `B-10`.

## Sources

- **scope.md** · **docs/design-stack.md** · **docs/aws-learning-map.md**
- **Fork plans** (`~/Sites/alphaTabWebsite/.../AlphaTabRhythmGame/`): FEATURES.md · AUTO_BPM.md · PERFORMANCE.md · PRACTICE_MODAL_PLAN.md · IMPLEMENTATION_SUMMARY.md · MIDI_MAPPING_PLAN(.md/_SUMMARY/_QUICK_REF/_VISUAL_GUIDE) · IMPLEMENTATION_COMPLETE.md · IMPROVEMENTS_SUMMARY.md
- **Brainstorms** (`serene-grothendieck-fb5e67/`): stack-aws-brainstorm.md · stack-brainstorm.md (§6 friendly-view UI)
- **Internal reference screenshots:** tracked privately in `docs/.private/` and the project's ~~Linear Document~~ <!-- Linear retired 2026-06-11; tracker is now Jira project KAN — see docs/decisions/2026-06-11-tracker-linear-to-jira.md. The "Linear Document" artifact is historical; re-home under the Jira/KAN equivalent. -->; not in the public repo.
