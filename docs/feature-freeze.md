# NotationHero — Feature Freeze (go / no-go)

> **Status:** DRAFT — under review (checkpoint 2026-06-05; some rows still `reviewed` with open questions)
> **Created:** 2026-06-05 · **Owner:** leocaseiro
> **Companions:** [docs/design-stack.md](design-stack.md) · [scope.md](../scope.md) · [docs/aws-learning-map.md](aws-learning-map.md)
> **Fork (Phase 0):** `~/Sites/alphaTabWebsite` (branch `rhythm-game`) — live: https://leocaseiro.github.io/alphaTabWebsite/docs/rhythm-game

Single canonical per-feature go/no-go. Each row has a proposed **Milestone** (your decision), fork-reuse status, effort, AWS candidacy, and a **Status** you set during review. Reference any feature by **ID** (e.g. `A-1`, `D-2-a`). Children (`X-n-a`) decompose a parent feature.

> **Process:** (1) you review each row, set Status + adjust Milestone; (2) we review together; (3) the locked freeze folds into `design-stack.md` with a `**Feature freeze locked YYYY-MM-DD**` marker. The whole-app `/design-shotgun` UI pass runs **after** this freeze.

## Decisions log

> Running record of locked decisions, applied to the rows below. Newest first.

- **2026-06-05 (checkpoint):**
  - **Ladder renumbered (monotonic):** `M3` = enhancements · `M4` = desktop · `M5` = pro-audio (ASIO).
  - **Sync model:** *no per-device sync.* User data = **localStorage in Alpha/Beta**; **cross-device sync = M1** (Cognito User Pools). Every "DynamoDB sync" row follows this rule. Identity Pools / guest-id not needed.
  - **Area `K` added (Admin / CMS):** Alpha; hosted admin gated by a **CloudFront Function (Basic Auth)** — no Cognito; produces the shared lesson library (feeds `H-11`).
  - **Competitor-name scrub:** feature names use generic terms; load-bearing strategic refs kept (the reference tutor north-star, positioning-wedge analysis in design-stack.md, the reference tutor screenshots).

---

## Milestone ladder

No "v" labels — SemVer is reserved for real releases. These are planning rungs.

| Rung | Gate (what "done" means) |
|---|---|
| **Alpha / EAP** | PWA rhythm game working + minimum AWS + usable on iPad via the WebMIDI shim (personal dogfood). Fast fork migration. |
| **Beta** | PWA hardened + AWS portfolio depth (analytics + SLOs) + preloaded exercises, pre-public. |
| **Friendly** | Friendly notation view (design-gated). Sits between Beta and M1. |
| **M1** | First native + $2 App Store launch (iPad CoreMIDI bridge, Cognito accounts, cross-device sync, uploads). |
| **M2** | Android native + advanced practice/audio. |
| **M3** | Enhancements / polish (velocity & dynamics, kit diagram, imports, auto-suggest, extra mappings). |
| **M4** | Desktop (Mac/Win PWA polish, Electron, keyboard shortcuts). |
| **M5** | Pro-audio (Windows ASIO/WinMM low-latency). |
| **deferred** | Out of scope for now. |

## Legend

- **Scope:** `R` required (scope.md) · `N` nice-to-have (scope.md) · `A` added (design-stack / doc-review / fork)
- **Fork:** `✓` built · `◑` partial · `📋` planned-only (fork plan exists, not built) · `✗` none
- **Est** (base build/port; excludes repo-wide clean-room rewrite overhead): `XS` <½d · `S` 1-2d · `M` 3-5d · `L` 1-2wk · `XL` 3wk+
- **AWS:** `req` needed · `sug` portfolio candidate · `@M1` = cross-device sync arrives with real accounts (per Decisions log)
- **Milestone:** proposed — your go/no-go
- **Status:** `TBD` · `approved` · `reviewed` (has an open question/note) · `changed`
- **Ref/Notes:** fork doc references · `✚` needs own `docs/specs/<feature>.md` · `⚠` caveat/blocker · `[...]` = your review note

---

## A. Notation, rendering & feedback

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| A-1 | Standard drum notation render | Render uploaded `.gp`/`.mid` as standard drum notation (AlphaTab SVG) | R | ✓ | M | — | Alpha | approved | FEATURES.md (test MusicXML); needs `core.includeNoteBounds=true` |
| A-2 | Real-time hit feedback rings | Perfect/early/late colored ring on noteheads, live | R | ✓ | S | — | Alpha | approved | FEATURES.md (blue good / orange early / purple late). ⚠ scope wants green=perfect — reconcile colors |
| A-2-a | Separate early vs late | Distinguish early (orange) from late (purple) within "good" | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x] |
| A-3 | Missed note = no feedback | Missed expected notes show no marker | R | ✓ | XS | — | Alpha | approved | scope §feedback |
| A-4 | Extra/wrong-hit red cross | Red cross at the *actually-hit* staff position | R | ◑ | M | — | Alpha | reviewed | PERFORMANCE.md (cross-markers.tsx); needs `boundsLookup` `[new: need to get fixed properly. Wortht a hole superpowers:brainstorm to do it]` |
| A-5 | Velocity → ghost-note visual | Lighter feedback for low-velocity (ghost) hits | R | ◑ | S | — | M3 | reviewed | velocity read in fork; design-stack v1 |
| A-6 | Accessibility: color+shape+text | Pair every feedback color with a shape + text label | A | ✗ | S | — | deferred | reviewed | doc-review; stack-brainstorm §6 `[this is something we can do in Friendly, do we need for notation too, if not, what are the A11Y we need to work on]?` |
| A-7 | NotationRenderer interface | Abstraction so friendly view plugs in later w/o refactor | A | ✗ | S | — | Beta | reviewed | design-stack Approach A; unblocks **G** `[Q: what do we need here? a toggle for the UI? This should be done in the same time we work on the friendly-view. If not, I am confuse what this means.]` |
| A-8 | Ignore-error drawings (pedal hihat) | Suppress error markers for pedal-hihat prep hits | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x]; relates `D-4` |

## B. Transport & player controls

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| B-1 | Load local song | Upload/open `.gp/.gpx/.gp5/.mid` from device | R | ✓ | S | — | Alpha | reviewed | local only; cloud upload = `K`/`H-10` `[Q: we need to be careful on this one because of copyright licenses. Should we allow any upload on S3 or this could be a problem to us?]` |
| B-2 | Transport controls | Play / pause / stop / back-to-start | R | ✓ | XS | — | Alpha | approved | scope §player |
| B-3 | Loop on/off | Toggle looping (off by default) | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x] |
| B-4 | Repeat on/off | Toggle repeat (off by default); distinct from loop | R | ✗ | S | — | Alpha | reviewed | clarify semantics vs `B-3`/`B-9`; FEATURES.md (detect repeats TODO) `Q: I am confused, what is the difference from A/B loop?` |
| B-5 | Count-in | Metronome count-in per beat, time-sig aware | R | ✓ | S | — | Alpha | reviewed | FEATURES.md [x]; ⚠ alphaTab #2397 media-sync `[note: there is a bug with metronome + audio/video https://github.com/CoderLine/alphaTab/issues/2397#issuecomment-3974123450]` |
| B-6 | Metronome on/off | Toggle metronome (on by default) | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x] |
| B-7 | Tempo adjust (BPM + %) | Dual-mode tempo/speed control | R | ✓ | XS | — | Alpha | approved | PRACTICE_MODAL_PLAN.md (bpm-speed-control) |
| B-8 | Display options | Scale / stretch / layout / cursors / highlight | R | ✓ | XS | sug: DynamoDB sync @M1 | Alpha | reviewed | IMPLEMENTATION_SUMMARY.md (practice modal) `[Q: I assume this and some other options would also be a good candidate for dynamoDB sync. WDYT?` |
| B-9 | A/B loop via timeline | Click point A & B on a mini timeline-view | R | ◑ | M | — | Friendly | reviewed | ✚ `timeline-ab-loop`; FEATURES.md (loop-on-mobile TODO) `[note: this feature is already available in the fork. The current selection is owned by AlphaTab. We could improve its UI, but the improvement can be included same time we work on friendly-view mode]` |
| B-10 | Per-instrument volume mixer | Volume per track (drums/guitar/bass) | R | ◑ | M | sug: DynamoDB sync @M1 | Beta | approved | ✚ `mixer-ui`; ⚠ API = `changeTrackVolume` (not `applyTrackVolume`); IMPLEMENTATION_SUMMARY.md (master/metro/count-in done) `[approved with dynamoDB]` |
| B-10-a | Mute-mine / solo-mine | Solo or mute the player's own instrument | R | ✗ | M | — | Beta | reviewed | ✚ `mixer-ui`; scope §player `[Q: I'ts already done, isn't?]` |
| B-11 | MIDI instrument selector | Choose drums (default) or keyboard | R | ✗ | S | localStorage; sug: DynamoDB @M1 | Beta | reviewed | FEATURES.md (test-piano TODO) `[Q: based on the toggles to display the track, this can be defined as partially, no?` `[approved with dynamoDB]` |
| B-12 | Keyboard shortcuts | Hotkeys play/pause/restart etc | N | ✗ | S | — | M4 | approved | FEATURES.md (shortcuts TODO); desktop-focused |

## C. Scoring, rating, streak & history

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| C-1 | Hit-scoring engine | Timing-window scoring of MIDI hits (JS / Web MIDI) | R | ✓ | M | — | Alpha | approved | ⚠ **Sightread scrub** (swap 50/300ms consts + strip comments); PERFORMANCE.md |
| C-2 | Score % at song end | 0-100 score per play | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x] |
| C-3 | 5-star rating | Map score % → 5 stars | R | ◑ | S | — | Alpha | approved | scope §rating |
| C-4 | In-session streak | Current + longest streak within a play | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x] |
| C-5 | Save score each play | Persist each play's score (local; sync later) | R | ✗ | S | localStorage; sug: DynamoDB @M1 | Beta | reviewed | scope §rating ("save percentage each time") `[approved with dynamoDB. Make sure to set score with the game mode: practice/game/ game memory] ` `[Q: for AWS, is using SQS/SQN or Kafka worth here for another Milestone? same for the C-6 and C-7]` |
| C-6 | Cross-session daily streak | Calendar daily-streak history | N | ✗ | M | sug: DynamoDB (sync @M1) | M2 | approved | scope nice; design-stack v1.5 |
| C-7 | Per-session score history | Detailed history per play/practice session | N | ✗ | M | sug: DynamoDB (sync @M1) | M2 | approved | scope nice |

## D. MIDI input & mapping

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| D-1 | Web MIDI input + device select | Connect & choose a MIDI input device | R | ✓ | S | — | Alpha | approved | iPad via shim (`I-1`), Android via Chrome (`I-2`) |
| D-1-a | Multi-device warning | Warn when multiple MIDI devices connected | A | ✗ | XS | — | Beta | approved | FEATURES.md TODO |
| D-2 | MIDI mapping (multi-zone) | Map several input notes (51/52/53) → one notation note | R | ✓ | S | localStorage; sug: DynamoDB sync @M1 | Alpha | approved | ✚ `midi-mapping-ui`; MIDI_MAPPING_PLAN(.md/_SUMMARY/_QUICK_REF/_VISUAL_GUIDE) + IMPLEMENTATION_COMPLETE.md |
| D-2-a | Presets (Yamaha/Roland/Alesis/Full) | Built-in kit presets + Full-kit one-click | R | ✓ | XS | localStorage; sug: DynamoDB @M1 | Alpha | reviewed | IMPROVEMENTS_SUMMARY.md `[Q: can we ake sure we persist latest choice at least for local? Nice to have for dynamoDB too]` |
| D-2-b | Custom mapping + listen mode | Capture MIDI by hitting a pad, or manual entry; save custom presets | R | ✓ | XS | — | Alpha | approved | IMPLEMENTATION_COMPLETE.md |
| D-2-c | Import/export mappings (JSON) | Share mapping configs as JSON | N | 📋 | S | — | M2 | approved | MIDI_MAPPING_PLAN.md (future) |
| D-2-d | Per-song mapping profiles | Mapping varies per song | N | 📋 | M | sug: DynamoDB sync @M1 | M2 | approved | MIDI_MAPPING docs (future) |
| D-2-e | Velocity-based mappings | Map by soft vs hard hit | N | 📋 | M | — | M3 | reviewed | MIDI_MAPPING docs (future) |
| D-2-f | Visual drum-kit diagram | Show zones on a kit graphic | N | 📋 | L | — | M3 | reviewed | MIDI_MAPPING docs (future); overlaps `J-6` |
| D-2-g | Auto-detect e-drum kit | Detect kit/zones from MIDI output | N | ◑ | S | — | M2 | approved | IMPROVEMENTS_SUMMARY.md (`getMidiGroupForNote`) |
| D-3 | Pre-check missing mappings | Analyse song; flag unmapped notes before play | N | ✗ | S | — | M3 | reviewed | FEATURES.md TODO |
| D-4 | Pedal hi-hat forgiveness | Ignore extra-hit errors but count correct hits | R | ✓ | XS | — | Alpha | approved | FEATURES.md [x]; scope §MIDI |

## E. Practice & Game modes

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| E-1 | Game mode | Lock tempo/A-B/repeat; play start-to-finish | R | ✗ | S | — | Beta | approved | ✚ `game-mode-ux`; scope §Game mode |
| E-2 | Practice mode | Free tempo/A-B/repeat (the non-locked mode) | R | ◑ | S | — | Alpha | approved | PRACTICE_MODAL_PLAN.md |
| E-3 | Auto-speed | Accuracy-gated BPM increase per cycle to target | R | ✓ | S | — | Alpha | approved | **AUTO_BPM.md** — fork-DONE fast win |
| E-4 | Memory mode | Hide notation; reveal on error; fade after perfect hits | R | ✗ | L | — | Beta | reviewed | ⚠ perf-sensitive; FEATURES.md (memory TODO) `[How is this large? I thought it would be something like. On perfect hit, we throtle to fadeOut, and on wrong hit, we show real quick. Wanna brainstorm that?]` |
| E-5 | Auto-suggest practice mode | If many errors, suggest slower-tempo practice | N | ✗ | S | — | M3 | reviewed | FEATURES.md (future) |

## F. Configuration & persistence

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| F-1 | Latency compensation | ±100ms per-device offset slider | R | ✗ | M | localStorage; sug: DynamoDB @M1 | Beta | approved | ✚ `latency-compensation-ui`; FEATURES.md (latency-config TODO); PWA→JS / native→bridge (`M1`) |
| F-2 | Configurable timing windows | Set GOOD / PERFECT ms thresholds | R | ✗ | S | — | Beta | approved | FEATURES.md TODO |
| F-3 | Save settings (local) | Persist settings to localStorage / IndexedDB | R | ◑ | S | localStorage; sug: DynamoDB sync @M1 | Alpha | approved | mapping persists; rest TODO `[approved with dynamoDB]` |
| F-4 | Dark mode / theme | Dark theme support | N | ✓ | XS | — | Alpha | approved | FEATURES.md [x] `[PS: we might skip that one, want to brainstorm via design shotgun the whole UI first]` |
| F-5 | Preload drawing positions | Precompute note positions for perf | A | ◑ | S | — | Beta | approved | FEATURES.md (vibe-coded, needs review); PERFORMANCE.md |

## G. Friendly notation view  *(rung between Beta & M1)*

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| G-1 | Friendly highway view | Horizontal highway (primary) | N | ✗ | XL | — | Friendly | approved | ✚ `/design-shotgun`; stack-brainstorm §6; PixiJS |
| G-1-a | Vertical falling-notes (alt) | Vertical falling-notes alternate view | N | ✗ | L | — | Friendly | reviewed | stack-brainstorm §6 (renamed — no competitor names per convention) |
| G-2 | Friendly-view feedback | Gem shapes, tendency meter, combo glow, hit-window band | N | ✗ | L | — | Friendly | approved | stack-brainstorm §6 |

## H. AWS backend & infra  *(portfolio track — runs parallel; PWA-first unblocks it)*

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| H-1 | Pulumi TS IaC | Provision all AWS as TypeScript code | A | ✗ | M | req: (all) | Alpha | approved | stack-aws-brainstorm; interview multiplier |
| H-2 | Lambda Function URL | Public Lambda (hello-world → API) | A | ✗ | M | req: Lambda | Alpha | approved | JWT-in-handler added with `H-9` |
| H-3 | DynamoDB single-table + GSI | Shared content + (at M1) per-user cross-device sync | A | ✗ | L | req: DynamoDB | Alpha | approved | Alpha use = shared data (lessons via `K`, analytics); per-user **cross-device sync = M1** with auth (per Decisions log) |
| H-4 | S3 + CloudFront + OAC | Host the PWA static bundle | A | ✗ | M | req: S3·CloudFront | Alpha | approved | 1 TB free tier; needed to ship the PWA |
| H-5 | Offline-sync client | RxDB vs Legend-State pull/push handler | A | ✗ | M | — | M1 | reviewed | spike both; design-stack Open Q `[Q: I am confused, is this only needed for client offline mode? Should we also have Service Worked setup for offline mode?]` |
| H-6 | SQS/SNS → S3 → Athena analytics | Usage-event pipeline (queue + data lake) | A | ✗ | L | req: SQS·SNS·S3·Athena | Beta | approved | **richest interview piece**; needs `J-8` event emit `[Q: Where are we going to use Athena?]` |
| H-7 | CloudWatch + X-Ray SLOs | SLIs/SLOs, burn-rate alarms, traces | A | ✗ | L | req: CloudWatch·X-Ray | Beta | approved | SRE story |
| H-8 | Sentry client errors | Client JS error tracking | A | ✗ | S | — | Alpha | approved | ⚠ PII masking (doc-review) |
| H-9 | Cognito auth (User Pools) | Hosted UI + PKCE + Google federation → real accounts | A | ✗ | L | req: Cognito | M1 | approved | enables cross-device sync; ⚠ Capacitor-redirect spike (F-15). (Admin CMS `K-2` uses CloudFront-Function Basic Auth, NOT Cognito) |
| H-10 | S3 uploads + validation | Pre-signed PUT, magic-byte validate, quarantine, rate-limit | R | ✗ | L | req: S3·Lambda | M1 | approved | scope §upload (end-user uploads); admin-side pipeline reused by `K-1` |
| H-11 | Lesson / song library | Curated lessons (S3 files + DynamoDB metadata) | N | ✗ | M | req: S3·DynamoDB | Beta | reviewed | produced by area `K` (CMS, Alpha); initial preloaded set in Beta; expand at M1 `[Note: I want to have in Beta a list of exercises preloaded]` |
| H-12 | Kafka (local Docker) | Queue-vs-log learning, off-AWS | A | ✗ | M | — | deferred | reviewed | interview-only; separate project `[OK, do you have any suggestion at all to use Kafka?]` |

## I. Native shells & platforms

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| I-1 | iPad via WebMIDI shim | Run the PWA on iPad through WebMIDIAPIShimForiOS | A | ✓ | XS | — | Alpha | approved | ⚠ **personal dogfood only, NOT distributable**; Array.from/Tone.js caveat (fork uses AlphaSynth → likely dodges) |
| I-2 | Android via Chrome PWA | Run the PWA on Android Chrome (native Web MIDI) | R | ✓ | XS | — | Alpha | approved | no native bridge needed |
| I-3 | Capacitor iPad + Swift CoreMIDI bridge | Native MIDI plumbing for the iPad shell | R | ✗ | XL | — | M1 | approved | ✚ bridge protocol; enables App Store distribution |
| I-4 | Native scoring + tick-map IPC | Score in Swift; JS↔native sync protocol (<10ms feel) | A | ✗ | XL | — | M1 | approved | ✚; design-stack protocol; the "native scoring" plumbing |
| I-5 | iOS audio-session interruption | Pause/resume on call / Siri / AirPods | A | ✗ | M | — | M1 | approved | design-stack v1 |
| I-6 | Android Kotlin bridge | Native MIDI for the Android shell (latency parity) | A | ✗ | XL | — | M2 | approved | design-stack v1.5 |
| I-7 | Desktop PWA polish | Mac/Win Chrome/Edge polished PWA | R | ◑ | M | — | M4 | reviewed | fork runs on Mac Chrome today `[Note: we might prioritize the improvements that I called M4 to be launched before the desktop polish]` (now renumbered: enhancements = M3, desktop = M4) |
| I-8 | Electron wrapper | Desktop app wrapper | N | ✗ | L | — | M4 | approved | if PWA install friction proves real |
| I-9 | Windows ASIO/WinMM bridge | Pro-latency native Windows audio | N | ✗ | XL | — | M5 | reviewed | may stay deferred |

## J. Media & extras

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| J-1 | Backing-track (MP3) | Play an MP3 alongside | N | ◑ | S | sug: S3 host ~S | M2 | reviewed | works via AlphaTab already `[This is already implemented by AlphaTab, and it's actually working already, only issue is the metronome and count-down.` `I don't think we need Tone.js, unless we would need for friendly-view` `https://github.com/CoderLine/alphaTab/issues/2397#issuecomment-3974123450.` |
| J-2 | Video (MP4/YouTube) sync | Background video synced to playback | N | ✗ | L | — | M2 | reviewed | scope nice `[same as above]` |
| J-3 | Import alphaTex / .midi | Import patterns via AlphaTab alphaTex or raw `.midi` | N | ✗ | M | — | M3 | reviewed | `[Note: we can use AlphaTab https://alphatab.net/docs/alphatex/introduction]` |
| J-4 | Share results (PDF/CSV) | Export score/results | N | ✗ | S | sug: Lambda gen ~S | deferred | approved | FEATURES.md (future) |
| J-5 | Ghost-note dynamics detect + chart | Detect dynamics; the reference tutor-style dynamics chart | N | ✗ | L | — | M3 | reviewed | scope nice (dynamic detection) |
| J-6 | Drumkit SVG guide | Highlighted drum-kit SVG on guide notes / feedback | N | ✗ | L | — | M3 | reviewed | FEATURES.md (future) `[I don't think it overlaps with D-2-f, we can show in both views. Notation or friendly view]. See an example in the reference tutor here /Users/leocaseiro/Downloads/internal-reference-1.jpg and /Users/leocaseiro/Downloads/internal-reference-2.jpg]` |
| J-7 | Mobile phone support | Small-screen redesign | N | ✗ | XL | — | deferred | approved | scope nice; phone = its own project |
| J-8 | Analytics instrumentation (client) | Emit usage events to the pipeline | A | ✗ | S | req: feeds `H-6` | Beta | approved | enables `H-6` |
| J-9 | Discord / social / publishing | Community + alternate.to listings | N | ✗ | XS | — | deferred | approved | FEATURES.md (future); ops, not app |

## K. Admin / CMS (lesson management)  *(producer side of the shared-lesson model)*

| ID | Feature | Description | Scope | Fork | Est | AWS | Milestone | Status | Ref/Notes |
|---|---|---|---|---|---|---|---|---|---|
| K-1 | Lesson store (files + catalog) | Store + validate lesson files and metadata | A | ✗ | M | req: S3 · DynamoDB · Lambda(validate) | Alpha | approved | shared content (no identity); feeds `H-11`; admin-curated → sidesteps `B-1` copyright |
| K-2 | Hosted admin SPA + CRUD | Manage/upload lessons; htpasswd-style gate | A | ✗ | M | req: S3 · CloudFront · CloudFront Function (Basic Auth) · Lambda FURL | Alpha | approved | **no Cognito**; edge Basic-Auth (rotate = redeploy, HTTPS-only); edge-auth portfolio piece |
| K-3 | Lesson catalog API + delivery | App reads catalog + downloads lesson files | A | ✗ | S | req: Lambda · CloudFront | Alpha | approved | consumed by the app; feeds `H-11` |

---

## AWS portfolio candidates (ranked by interview value)

Core (`req`) vs bolt-on (`sug`). Per the **sync model**: per-user data is localStorage in Alpha/Beta; DynamoDB *cross-device* sync arrives at M1. DynamoDB still earns its place early via **shared data** (lessons `K`, analytics).

**Core showcases (build as the portfolio spine):**

1. `H-6` Analytics pipeline (SQS/SNS → S3 → Athena) — messaging + data-lake story — **L** — *Beta*
2. `H-7` CloudWatch/X-Ray SLOs + burn-rate — SRE/observability — **L** — *Beta*
3. `K-1`/`K-2`/`K-3` Admin CMS — S3 + DynamoDB + Lambda + CloudFront + edge Basic-Auth, real product reason — **M+M+S** — *Alpha*
4. `H-3` DynamoDB single-table + GSI (shared data now; per-user sync @M1) — **L** — *Alpha*
5. `H-1` Pulumi IaC — infrastructure-as-code — **M** — *Alpha*
6. `H-2` Lambda Function URL — serverless basics — **M** — *Alpha*
7. `H-4` S3 + CloudFront + OAC — CDN/static hosting — **M** — *Alpha*
8. `H-9` Cognito User Pools (OAuth2/PKCE/OIDC) — unlocks cross-device sync — **L** — *M1*
9. `H-10` S3 uploads + validation pipeline — secure-upload story — **L** — *M1*

**Bolt-ons (turn a local feature into an AWS showcase, all `@M1` for cross-device):**

- `F-3` settings sync · `C-5` score history · `D-2` mapping sync · `F-1` latency per-device · `B-8` display options · `B-10` mixer · `J-4` share → Lambda PDF

> Note: the entire app **can ship as a pure PWA with zero AWS**. AWS is opt-in per feature, driven by the job-hunt goal.

## Headline moves vs `design-stack.md`

**PWA-first pivot** moved native scoring/latency/audio-interruption to **M1** (`I-3`/`I-4`/`I-5`); AWS core moved **up to Alpha** (`H-1..H-4`) + portfolio centerpiece to **Beta** (`H-6`/`H-7`). **Sync model:** no per-device sync — localStorage in Alpha/Beta, real cross-device sync at **M1** (Cognito User Pools). **New area `K` (Admin/CMS)** in Alpha = the producer of the shared lesson library, gated by CloudFront-Function Basic Auth (no Cognito). **Auto-speed → Alpha** (`E-3`); **memory mode → Beta** (`E-4`, per your re-size). **Friendly view → its own rung**. **Ladder renumbered:** M3 = enhancements, M4 = desktop, M5 = pro-audio.

## Things to eyeball during review

- `A-2` ⚠ fork uses **blue** for good hits; scope.md wants **green** for perfect — reconcile.
- `C-1` ⚠ scoring engine carries the **Sightread scrub** (license action) before reuse.
- `B-10` ⚠ mixer uses `changeTrackVolume` (not the doc's `applyTrackVolume`) — verify vs AlphaTab 1.8.1 `.d.ts`.
- `I-1` ⚠ the iPad shim is **dogfood-only, not distributable** — the paid launch needs `I-3` (native bridge).
- `K-2` ⚠ Basic Auth is HTTPS-only + credential baked into the CloudFront Function (rotate = redeploy) — fine for single-admin.

## Open questions still in review (the `reviewed` rows)

Cluster ① AlphaTab/Tone.js: `J-1` `J-2` `B-5` `B-9` `J-3` · Cluster ② AWS depth: `C-5` `H-6` `H-12` · Cluster ③ Notation: `A-4` `A-6` `A-7` · Cluster ④ Clarity: `B-4` `B-10-a` `B-11` `E-4` `H-5` · Cluster ⑤ Misc: `B-1` `F-4` `J-6` · plus `D-2-a` `H-11`.

## How to review this file

1. Set **Status** per row → `approved` / `changed` (note new milestone) / `reviewed` (open question).
2. Adjust the **Milestone** cell where you disagree.
3. Add children (`X-n-a`) to split any feature.
4. Reference rows by **ID** when we talk.
5. When done, ping me — we lock it, then fold into `design-stack.md` + add the `**Feature freeze locked YYYY-MM-DD**` marker.

## Sources

- **scope.md** — original requirements (required vs nice-to-have)
- **docs/design-stack.md** — approved tech plan + Success Criteria + 2026-06-04 doc-review Deferred/Open-Questions
- **docs/aws-learning-map.md** — service → feature vehicle map (job-hunt track)
- **Fork plans** (`~/Sites/alphaTabWebsite/.../AlphaTabRhythmGame/`): FEATURES.md · AUTO_BPM.md · PERFORMANCE.md · PRACTICE_MODAL_PLAN.md · IMPLEMENTATION_SUMMARY.md (Practice Modal) · MIDI_MAPPING_PLAN.md · MIDI_MAPPING_PLAN_SUMMARY.md · MIDI_MAPPING_IMPLEMENTATION_SUMMARY.md · MIDI_MAPPING_QUICK_REF.md · MIDI_MAPPING_VISUAL_GUIDE.md · IMPLEMENTATION_COMPLETE.md · IMPROVEMENTS_SUMMARY.md
- **Companion brainstorms** (`serene-grothendieck-fb5e67/`): stack-aws-brainstorm.md · stack-brainstorm.md (§6 friendly-view UI)
