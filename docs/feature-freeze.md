# NotationHero — Feature Freeze (go / no-go)

> **Status:** DRAFT — under review (set per-row Status as you go)
> **Created:** 2026-06-05 · **Owner:** leocaseiro
> **Companions:** [`docs/design-stack.md`](design-stack.md) · [`scope.md`](../scope.md)
> **Fork (Phase 0):** `~/Sites/alphaTabWebsite` (branch `rhythm-game`) — live: https://leocaseiro.github.io/alphaTabWebsite/docs/rhythm-game

Single canonical per-feature go/no-go. Each row has a proposed **Milestone** (your decision), fork-reuse status, effort, AWS candidacy, and a **Status** you set during review. Reference any feature by **ID** (e.g. `A-1`, `D-2-a`) in discussion. Children (`X-n-a`) decompose a parent feature.

> **Process:** (1) you review each row on this file, set Status + adjust Milestone; (2) we review together; (3) the locked freeze is folded into `design-stack.md` with a `**Feature freeze locked YYYY-MM-DD**` marker. The whole-app `/design-shotgun` UI pass runs **after** this freeze.

---

## Milestone ladder

No "v" labels — SemVer is reserved for real releases. These are planning rungs.

| Rung | Gate (what "done" means) |
|---|---|
| **Alpha / EAP** | PWA rhythm game working + minimum AWS + usable on iPad via the WebMIDI shim (personal dogfood). Fast fork migration. |
| **Beta** | PWA hardened + AWS portfolio depth (analytics + SLOs), pre-public. |
| **Friendly** | Friendly notation view (subscription tutor/falling-notes app), design-gated. Sits between Beta and M1. |
| **M1** | First native + $2 App Store launch (iPad CoreMIDI bridge, Cognito accounts, uploads). |
| **M2** | Android native + advanced practice/audio. |
| **M3 / later** | Desktop (Mac/Win polish, Electron, Windows ASIO). |
| **deferred** | Out of scope for now. |

## Legend

- **Scope:** `R` required (scope.md) · `N` nice-to-have (scope.md) · `A` added (design-stack / doc-review / fork)
- **Fork:** `✓` built · `◑` partial · `📋` planned-only (fork plan exists, not built) · `✗` none
- **Est** (base build/port; excludes repo-wide clean-room rewrite overhead): `XS` <½d · `S` 1-2d · `M` 3-5d · `L` 1-2wk · `XL` 3wk+
- **AWS:** `req` needed · `sug` portfolio candidate · `~est` AWS add-on effort
- **Milestone:** proposed — your go/no-go
- **Status:** `TBD` · `approved` · `changed` (if changed, note the new milestone)
- **Ref/Notes:** fork doc references · `✚` needs own `docs/specs/<feature>.md` · `⚠` caveat/blocker

---

## A. Notation, rendering & feedback

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| A-1 | Standard drum notation render | Render uploaded `.gp`/`.mid` as standard drum notation (AlphaTab SVG) | R | ✓ | M | — | Alpha | TBD | FEATURES.md (test MusicXML); needs `core.includeNoteBounds=true` |
| A-2 | Real-time hit feedback rings | Perfect/early/late colored ring on noteheads, live | R | ✓ | S | — | Alpha | TBD | FEATURES.md (blue good / orange early / purple late). ⚠ scope wants green=perfect — reconcile colors |
| A-2-a | Separate early vs late | Distinguish early (orange) from late (purple) within "good" | R | ✓ | XS | — | Alpha | TBD | FEATURES.md [x] |
| A-3 | Missed note = no feedback | Missed expected notes show no marker | R | ✓ | XS | — | Alpha | TBD | scope §feedback |
| A-4 | Extra/wrong-hit red cross | Red cross at the *actually-hit* staff position | R | ◑ | M | — | Alpha | TBD | PERFORMANCE.md (cross-markers.tsx); needs `boundsLookup` |
| A-5 | Velocity → ghost-note visual | Lighter feedback for low-velocity (ghost) hits | R | ◑ | S | — | Beta | TBD | velocity read in fork; design-stack v1 |
| A-6 | Accessibility: color+shape+text | Pair every feedback color with a shape + text label | A | ✗ | S | — | Beta | TBD | doc-review; stack-brainstorm §6 |
| A-7 | NotationRenderer interface | Abstraction so friendly view plugs in later w/o refactor | A | ✗ | S | — | Beta | TBD | design-stack Approach A; unblocks **G** |
| A-8 | Ignore-error drawings (pedal hihat) | Suppress error markers for pedal-hihat prep hits | R | ✓ | XS | — | Alpha | TBD | FEATURES.md [x]; relates `D-4` |

## B. Transport & player controls

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| B-1 | Load local song | Upload/open `.gp/.gpx/.gp5/.mid` from device | R | ✓ | S | sug: S3 upload → `H-10` | Alpha | TBD | cloud upload = `H-10` |
| B-2 | Transport controls | Play / pause / stop / back-to-start | R | ✓ | XS | — | Alpha | TBD | scope §player |
| B-3 | Loop on/off | Toggle looping (off by default) | R | ✓ | XS | — | Alpha | TBD | FEATURES.md [x] |
| B-4 | Repeat on/off | Toggle repeat (off by default); distinct from loop | R | ✗ | S | — | Beta | TBD | clarify semantics vs `B-3`/`B-9`; FEATURES.md (detect repeats TODO) |
| B-5 | Count-in | Metronome count-in per beat, time-sig aware | R | ✓ | S | — | Alpha | TBD | FEATURES.md [x]; ⚠ alphaTab #2397 media-sync |
| B-6 | Metronome on/off | Toggle metronome (on by default) | R | ✓ | XS | — | Alpha | TBD | FEATURES.md [x] |
| B-7 | Tempo adjust (BPM + %) | Dual-mode tempo/speed control | R | ✓ | XS | — | Alpha | TBD | PRACTICE_MODAL_PLAN.md (bpm-speed-control) |
| B-8 | Display options | Scale / stretch / layout / cursors / highlight | R | ✓ | XS | — | Alpha | TBD | IMPLEMENTATION_SUMMARY.md (practice modal) |
| B-9 | A/B loop via timeline | Click point A & B on a mini timeline-view | R | ◑ | M | — | Beta | TBD | ✚ `timeline-ab-loop`; FEATURES.md (loop-on-mobile TODO) |
| B-10 | Per-instrument volume mixer | Volume per track (drums/guitar/bass) | R | ◑ | M | sug: DynamoDB sync ~S | Beta | TBD | ✚ `mixer-ui`; ⚠ API = `changeTrackVolume` (not `applyTrackVolume`); IMPLEMENTATION_SUMMARY.md (master/metro/count-in done) |
| B-10-a | Mute-mine / solo-mine | Solo or mute the player's own instrument | R | ✗ | M | — | Beta | TBD | ✚ `mixer-ui`; scope §player |
| B-11 | MIDI instrument selector | Choose drums (default) or keyboard | R | ✗ | S | sug: localStorage→DynamoDB ~S | Beta | TBD | FEATURES.md (test-piano TODO) |
| B-12 | Keyboard shortcuts | Hotkeys play/pause/restart etc | N | ✗ | S | — | M3 | TBD | FEATURES.md (shortcuts TODO); desktop-focused |

## C. Scoring, rating, streak & history

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| C-1 | Hit-scoring engine | Timing-window scoring of MIDI hits (JS / Web MIDI) | R | ✓ | M | — | Alpha | TBD | ⚠ **Sightread scrub** (swap 50/300ms consts + strip comments); PERFORMANCE.md |
| C-2 | Score % at song end | 0-100 score per play | R | ✓ | XS | — | Alpha | TBD | FEATURES.md [x] |
| C-3 | 5-star rating | Map score % → 5 stars | R | ◑ | S | — | Alpha | TBD | scope §rating |
| C-4 | In-session streak | Current + longest streak within a play | R | ✓ | XS | — | Alpha | TBD | FEATURES.md [x] |
| C-5 | Save score each play (local) | Persist each play's score locally | R | ✗ | S | sug: DynamoDB history ~M | Beta | TBD | scope §rating ("save percentage each time") |
| C-6 | Cross-session daily streak | Calendar daily-streak history | N | ✗ | M | sug: DynamoDB ~M | M2 | TBD | scope nice; design-stack v1.5 |
| C-7 | Per-session score history | Detailed history per play/practice session | N | ✗ | M | sug: DynamoDB ~M | M2 | TBD | scope nice |

## D. MIDI input & mapping

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| D-1 | Web MIDI input + device select | Connect & choose a MIDI input device | R | ✓ | S | — | Alpha | TBD | iPad via shim (`I-1`), Android via Chrome (`I-2`) |
| D-1-a | Multi-device warning | Warn when multiple MIDI devices connected | A | ✗ | XS | — | Beta | TBD | FEATURES.md TODO |
| D-2 | MIDI mapping (multi-zone) | Map several input notes (51/52/53) → one notation note | R | ✓ | S | sug: DynamoDB sync ~S | Alpha | TBD | ✚ `midi-mapping-ui`; MIDI_MAPPING_PLAN(.md/_SUMMARY/_QUICK_REF/_VISUAL_GUIDE) + IMPLEMENTATION_COMPLETE.md |
| D-2-a | Presets (Yamaha/Roland/Alesis/Full) | Built-in kit presets + Full-kit one-click | R | ✓ | XS | — | Alpha | TBD | IMPROVEMENTS_SUMMARY.md |
| D-2-b | Custom mapping + listen mode | Capture MIDI by hitting a pad, or manual entry; save custom presets | R | ✓ | XS | — | Alpha | TBD | IMPLEMENTATION_COMPLETE.md |
| D-2-c | Import/export mappings (JSON) | Share mapping configs as JSON | N | 📋 | S | — | M2 | TBD | MIDI_MAPPING_PLAN.md (future) |
| D-2-d | Per-song mapping profiles | Mapping varies per song | N | 📋 | M | sug: DynamoDB ~S | M2 | TBD | MIDI_MAPPING docs (future) |
| D-2-e | Velocity-based mappings | Map by soft vs hard hit | N | 📋 | M | — | deferred | TBD | MIDI_MAPPING docs (future) |
| D-2-f | Visual drum-kit diagram | Show zones on a kit graphic | N | 📋 | L | — | Friendly | TBD | MIDI_MAPPING docs (future); overlaps `J-6` |
| D-2-g | Auto-detect e-drum kit | Detect kit/zones from MIDI output | N | ◑ | S | — | M2 | TBD | IMPROVEMENTS_SUMMARY.md (`getMidiGroupForNote`) |
| D-3 | Pre-check missing mappings | Analyse song; flag unmapped notes before play | N | ✗ | S | — | Beta | TBD | FEATURES.md TODO |
| D-4 | Pedal hi-hat forgiveness | Ignore extra-hit errors but count correct hits | R | ✓ | XS | — | Alpha | TBD | FEATURES.md [x]; scope §MIDI |

## E. Practice & Game modes

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| E-1 | Game mode | Lock tempo/A-B/repeat; play start-to-finish | R | ✗ | S | — | Beta | TBD | ✚ `game-mode-ux`; scope §Game mode |
| E-2 | Practice mode | Free tempo/A-B/repeat (the non-locked mode) | R | ◑ | S | — | Alpha | TBD | PRACTICE_MODAL_PLAN.md |
| E-3 | Auto-speed | Accuracy-gated BPM increase per cycle to target | R | ✓ | S | — | Alpha | TBD | **AUTO_BPM.md** — fork-DONE fast win |
| E-4 | Memory mode | Hide notation; reveal on error; fade after perfect hits | R | ✗ | L | — | M2 | TBD | ⚠ perf-sensitive; FEATURES.md (memory TODO) |
| E-5 | Auto-suggest practice mode | If many errors, suggest slower-tempo practice | N | ✗ | S | — | deferred | TBD | FEATURES.md (future) |

## F. Configuration & persistence

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| F-1 | Latency compensation | ±100ms per-device offset slider | R | ✗ | M | sug: DynamoDB per-device ~S | Beta | TBD | ✚ `latency-compensation-ui`; FEATURES.md (latency-config TODO); PWA→JS / native→bridge (`M1`) |
| F-2 | Configurable timing windows | Set GOOD / PERFECT ms thresholds | R | ✗ | S | — | Beta | TBD | FEATURES.md TODO |
| F-3 | Save settings (local) | Persist settings to localStorage / IndexedDB | R | ◑ | S | sug: DynamoDB config sync ~M | Alpha | TBD | mapping persists; rest TODO. Your "config settings" AWS candidate |
| F-4 | Dark mode / theme | Dark theme support | N | ✓ | XS | — | Alpha | TBD | FEATURES.md [x] |
| F-5 | Preload drawing positions | Precompute note positions for perf | A | ◑ | S | — | Beta | TBD | FEATURES.md (vibe-coded, needs review); PERFORMANCE.md |

## G. Friendly notation view  *(rung between Beta & M1)*

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| G-1 | Friendly highway view | horizontal-highway-style horizontal highway (primary) | N | ✗ | XL | — | Friendly | TBD | ✚ `/design-shotgun`; stack-brainstorm §6; PixiJS |
| G-1-a | falling-notes app vertical alt | Vertical falling-notes alternate view | N | ✗ | L | — | Friendly | TBD | stack-brainstorm §6 |
| G-2 | Friendly-view feedback | Gem shapes, tendency meter, combo glow, hit-window band | N | ✗ | L | — | Friendly | TBD | stack-brainstorm §6 |

## H. AWS backend & infra  *(portfolio track — runs parallel; PWA-first unblocks it)*

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| H-1 | Pulumi TS IaC | Provision all AWS as TypeScript code | A | ✗ | M | req: (all) | Alpha | TBD | stack-aws-brainstorm; interview multiplier |
| H-2 | Lambda Function URL | Public Lambda (hello-world → sync API) | A | ✗ | M | req: Lambda | Alpha | TBD | JWT-in-handler added with `H-9` |
| H-3 | DynamoDB single-table + GSI | Per-user(device) data + change-feed sync | A | ✗ | L | req: DynamoDB | Alpha | TBD | device-ID key (no auth yet); offline-first |
| H-4 | S3 + CloudFront + OAC | Host the PWA static bundle | A | ✗ | M | req: S3·CloudFront | Alpha | TBD | 1 TB free tier; needed to ship the PWA |
| H-5 | Offline-sync client | RxDB vs Legend-State pull/push handler | A | ✗ | M | — | Beta | TBD | spike both; design-stack Open Q |
| H-6 | SQS/SNS → S3 → Athena analytics | Usage-event pipeline (queue + data lake) | A | ✗ | L | req: SQS·SNS·S3·Athena | Beta | TBD | **richest interview piece**; needs `J-8` event emit |
| H-7 | CloudWatch + X-Ray SLOs | SLIs/SLOs, burn-rate alarms, traces | A | ✗ | L | req: CloudWatch·X-Ray | Beta | TBD | SRE story |
| H-8 | Sentry client errors | Client JS error tracking | A | ✗ | S | — | Alpha | TBD | ⚠ PII masking (doc-review) |
| H-9 | Cognito auth | Hosted UI + PKCE + Google federation | A | ✗ | L | req: Cognito | M1 | TBD | you de-prioritized; ⚠ Capacitor-redirect spike (F-15); anon device-ID until M1 |
| H-10 | S3 uploads + validation | Pre-signed PUT, magic-byte validate, quarantine, rate-limit | R | ✗ | L | req: S3·Lambda | M1 | TBD | scope §upload; design-stack v1.5 pipeline |
| H-11 | Song library | 5-10 royalty-free tracks (S3 + DynamoDB meta) | N | ✗ | M | req: S3·DynamoDB | M1 | TBD | design-stack v1.5 |
| H-12 | Kafka (local Docker) | Queue-vs-log learning, off-AWS | A | ✗ | M | — | deferred | TBD | interview-only; separate project |

## I. Native shells & platforms

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| I-1 | iPad via WebMIDI shim | Run the PWA on iPad through WebMIDIAPIShimForiOS | A | ✓ | XS | — | Alpha | TBD | ⚠ **personal dogfood only, NOT distributable**; Array.from/Tone.js caveat (fork uses AlphaSynth → likely dodges) |
| I-2 | Android via Chrome PWA | Run the PWA on Android Chrome (native Web MIDI) | R | ✓ | XS | — | Alpha | TBD | no native bridge needed |
| I-3 | Capacitor iPad + Swift CoreMIDI bridge | Native MIDI plumbing for the iPad shell | R | ✗ | XL | — | M1 | TBD | ✚ bridge protocol; enables App Store distribution |
| I-4 | Native scoring + tick-map IPC | Score in Swift; JS↔native sync protocol (<10ms feel) | A | ✗ | XL | — | M1 | TBD | ✚; design-stack protocol; the "native scoring" plumbing |
| I-5 | iOS audio-session interruption | Pause/resume on call / Siri / AirPods | A | ✗ | M | — | M1 | TBD | design-stack v1 |
| I-6 | Android Kotlin bridge | Native MIDI for the Android shell (latency parity) | A | ✗ | XL | — | M2 | TBD | design-stack v1.5 |
| I-7 | Desktop PWA polish | Mac/Win Chrome/Edge polished PWA | R | ◑ | M | — | M3 | TBD | fork runs on Mac Chrome today |
| I-8 | Electron wrapper | Desktop app wrapper | N | ✗ | L | — | M3 | TBD | if PWA install friction proves real |
| I-9 | Windows ASIO/WinMM bridge | Pro-latency native Windows audio | N | ✗ | XL | — | M3 | TBD | may stay deferred |

## J. Media & extras

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| J-1 | Backing-track (MP3) | Play an MP3 alongside (Tone.js) | N | ✗ | M | sug: S3 host ~S | M2 | TBD | scope nice; iOS sync measurement first |
| J-2 | Video (MP4/YouTube) sync | Background video synced to playback | N | ✗ | L | — | M2 | TBD | scope nice |
| J-3 | Import GrooveScribe / .midi | Import patterns from GrooveScribe or raw `.midi` | N | ✗ | M | — | deferred | TBD | FEATURES.md (future) |
| J-4 | Share results (PDF/CSV) | Export score/results | N | ✗ | S | sug: Lambda gen ~S | deferred | TBD | FEATURES.md (future) |
| J-5 | Ghost-note dynamics detect + chart | Detect dynamics; the reference tutor-style dynamics chart | N | ✗ | L | — | M2 | TBD | scope nice (dynamic detection) |
| J-6 | Drumkit SVG guide | Highlighted drum-kit SVG on guide notes / feedback | N | ✗ | L | — | deferred | TBD | FEATURES.md (future); overlaps `D-2-f` |
| J-7 | Mobile phone support | Small-screen redesign | N | ✗ | XL | — | deferred | TBD | scope nice; phone = its own project |
| J-8 | Analytics instrumentation (client) | Emit usage events to the pipeline | A | ✗ | S | req: feeds `H-6` | Beta | TBD | enables `H-6` |
| J-9 | Discord / social / publishing | Community + alternate.to listings | N | ✗ | XS | — | deferred | TBD | FEATURES.md (future); ops, not app |

---

## AWS portfolio candidates (ranked by interview value)

Per your "I want good candidates + estimation for more AWS features." Core (`req`) vs bolt-on (`sug`):

**Core showcases (build as the portfolio spine):**
1. `H-6` Analytics pipeline (SQS/SNS → S3 → Athena) — messaging + data-lake story — **L** — *Beta*
2. `H-7` CloudWatch/X-Ray SLOs + burn-rate — SRE/observability — **L** — *Beta*
3. `H-3` DynamoDB single-table + GSI sync — data modeling + offline sync — **L** — *Alpha*
4. `H-1` Pulumi IaC — infrastructure-as-code — **M** — *Alpha*
5. `H-2` Lambda Function URL — serverless basics — **M** — *Alpha*
6. `H-4` S3 + CloudFront + OAC — CDN/static hosting — **M** — *Alpha*
7. `H-9` Cognito (OAuth2/PKCE/OIDC) — **L** — *M1* (you de-prioritized)
8. `H-10` S3 uploads + validation pipeline — secure-upload story — **L** — *M1*

**Bolt-ons (turn a local feature into an AWS showcase):**
- `F-3` settings sync → DynamoDB · `C-5` score history → DynamoDB · `D-2` mapping sync → DynamoDB · `F-1` latency per-device → DynamoDB · `J-4` share → Lambda PDF gen · `J-1`/`H-11` tracks → S3

> Note: the entire app **can ship as a pure PWA with zero AWS**. AWS is opt-in per feature, driven by the job-hunt goal — these are the highest-leverage places to add it.

## Headline moves vs `design-stack.md`

The **PWA-first pivot** inverts the doc's native-iPad-centric v1: native scoring, latency, audio-interruption moved to **M1** (`I-3`/`I-4`/`I-5`); this **unblocked AWS**, so AWS core moved **up to Alpha** (`H-1..H-4`) and the portfolio centerpiece to **Beta** (`H-6`/`H-7`). **Cognito → M1** (`H-9`; anon device-ID until then). **Auto-speed → Alpha** (`E-3`, fork-DONE); **memory mode → M2** (`E-4`). **Friendly view → its own rung** before M1. **Desktop → M3** (`I-7..I-9`). Everything fork-DONE clusters in **Alpha** = the fast-migration MVP.

## Things to eyeball during review

- `A-2` ⚠ fork uses **blue** for good hits; scope.md wants **green** for perfect — reconcile.
- `C-1` ⚠ scoring engine carries the **Sightread scrub** (license action) before reuse.
- `B-10` ⚠ mixer uses `changeTrackVolume` (not the doc's `applyTrackVolume`) — verify vs AlphaTab 1.8.1 `.d.ts`.
- `I-1` ⚠ the iPad shim is **dogfood-only, not distributable** — the paid launch needs `I-3` (native bridge).
- `G-1` Friendly view (XL) sits **before M1**: a big unbuilt+design-gated feature ahead of the paid launch — confirmed kept per review.

## How to review this file

1. Set **Status** per row → `approved` / `changed` (note new milestone) / leave `TBD`.
2. Adjust the **Milestone** cell where you disagree.
3. Add children (`X-n-a`) to split any feature.
4. Reference rows by **ID** when we talk.
5. When you're done, ping me — we review together, then I fold the locked freeze into `design-stack.md` + add the `**Feature freeze locked YYYY-MM-DD**` marker.

## Sources

- **scope.md** — original requirements (required vs nice-to-have)
- **docs/design-stack.md** — approved tech plan + Success Criteria + 2026-06-04 doc-review Deferred/Open-Questions
- **Fork plans** (`~/Sites/alphaTabWebsite/.../AlphaTabRhythmGame/`): FEATURES.md · AUTO_BPM.md · PERFORMANCE.md · PRACTICE_MODAL_PLAN.md · IMPLEMENTATION_SUMMARY.md (Practice Modal) · MIDI_MAPPING_PLAN.md · MIDI_MAPPING_PLAN_SUMMARY.md · MIDI_MAPPING_IMPLEMENTATION_SUMMARY.md · MIDI_MAPPING_QUICK_REF.md · MIDI_MAPPING_VISUAL_GUIDE.md · IMPLEMENTATION_COMPLETE.md · IMPROVEMENTS_SUMMARY.md
- **Companion brainstorms** (`serene-grothendieck-fb5e67/`): stack-aws-brainstorm.md · stack-brainstorm.md (§6 friendly-view UI)
