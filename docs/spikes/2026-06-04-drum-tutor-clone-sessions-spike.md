# Spike — Drum-Tutor-Clone Session Archaeology (2026-06-02 → 2026-06-04)

> **Purpose:** a complete, dated capture of *everything found and validated* — plus every
> open question — across the **four earliest sessions** of this project, back when the repo
> was named `drum-tutor-clone` (before the rename to `notation-hero`). The goal is that
> **nothing from those founding discussions is lost**, even where later decisions changed it.
>
> **Treatment:** each item is recorded *as it was validated at the time* (with the date), then
> annotated with a **`Now:`** line giving its current status and where the authoritative
> decision lives today. This is history, not a build instruction — for what to build today,
> follow the `Now:` pointers (mostly `docs/decisions/decision-registry.md`).
>
> **Written:** 2026-06-19 · **Method:** `ce-sessions` skeleton extraction over the four
> session transcripts + a full read of the four committed artifacts they produced
> (`stack-brainstorm.md`, `stack-aws-brainstorm.md`, `docs/design-stack.md`, `docs/handoff.md`).

---

## Legend

- ✅ **Validated** at the time (a fact verified or a decision the user accepted)
- 🟡 **Proposed / leaning** at the time (recommended but not locked)
- ⬜ **Open** at the time (a question left unanswered)
- `Now:` current status → `✅ still holds` · `🔁 evolved` · `⛔ superseded` · `❓ unresolved`

---

## 1. Sessions covered

| # | Session ID | Desktop title | Worktree / branch | Date range (local) | Verdict |
|---|---|---|---|---|---|
| 1 | `c9615811-444a-427a-8e80-a814484b621d` | "I have this project I want to start… See @scope.md" | `serene-grothendieck-fb5e67` | **2026-06-02 20:22 → 2026-06-03 05:15** | **Substantive** — tech-stack + AWS brainstorm |
| 2 | `53466813-7343-411e-8e12-99a3ea7b6d33` | same prompt **+ `/office-hours`** | `pensive-boyd-6d17e3` | **2026-06-03 05:08 → 2026-06-04 02:14** | **Substantive** — office-hours strategy + CI/CD kickoff + rename |
| 3 | `9d6a169e-6435-4dea-b291-0e4cab2dc7be` | same prompt (12 lines, 0 assistant replies) | `serene-grothendieck-fb5e67` | 2026-06-02 20:22 (aborted) | **Empty** — duplicate start, interrupted immediately. Nothing to capture. |
| 4 | `fdc2c0ed-df1b-43f1-a7f1-b416c5c2fc33` | `/gstack-upgrade` | `recursing-feistel-29cb4e` | 2026-06-03 05:06 (1 min) | **Empty** — tooling upgrade check ("already on v1.55.0.0"). Nothing project-relevant. |

> Sessions 3 and 4 were read and confirmed to hold no project decisions — listed here only so
> the record is provably complete.

**The original requirement source** both sessions worked from was `scope.md` (still in the repo).

---

## 2. Timeline of the discussion

| When (local) | Milestone |
|---|---|
| **Jun 2, 20:22** | Kickoff: "what language/tech?" pointed at `scope.md`. |
| Jun 2, 20:27 | First recommendation: **one TypeScript web app, AlphaTab as the music engine.** |
| Jun 2, 20:31 | Detour: **.NET MAUI / C#** evaluated → rejected (Mac can't build Windows). |
| Jun 2, 20:35 | Detour: **game engines (Unity/Godot)** evaluated → rejected. The "timing decoupled from rendering" insight lands here. |
| Jun 2, 21:01 | User reveals an existing **prototype** (`~/Sites/alphaTabWebsite`, a fork of CoderLine's demo) — read-only, "don't take anything." It **validates AlphaTab works**. |
| Jun 2, 21:16 | Ambition clarified: **personal now / product maybe later · free · web + iOS + Android · Mac-built.** |
| Jun 2, 21:20 | Lean architecture: **PWA covers everything free; Capacitor only for iOS.** |
| Jun 2, 21:27 → Jun 3 00:36 | Persistence thread: storage ≠ server · Next.js rejected · sync moved up · Firestore vs Supabase · RxDB/Legend-State/PowerSync. |
| **Jun 3, 01:02** | `stack-brainstorm.md` written + committed. |
| Jun 3, 01:04 → 01:44 | **AWS interview-prep reframe**: the app becomes a learning vehicle for Staff-FE system design. |
| **Jun 3, 01:09** | `stack-aws-brainstorm.md` written + committed; queues / auth / Pulumi / DynamoDB-bridge decided. |
| Jun 3, 04:52 → 05:15 | gstack installed globally (tooling; Cursor host hit a gstack bug — not project-relevant). |
| **Jun 3, 05:08** | Second session starts with `/office-hours` (six forcing questions). |
| Jun 3, 05:25 → 07:03 | Platform reality (Mac/iPad/Android MIDI) · `design-stack.md` written + run through **2 rounds of adversarial review** (score 6→8) · existing-work read ("you're way further ahead") · **license gate** (AlphaTab MPL-2.0 vs Sightread GPL-3). |
| Jun 3, 23:25 | `design-stack.md` **APPROVED**. The AskUserQuestion chunked-format rule is born here. |
| **Jun 3, 23:57** | **"We are in business."** Rename to `notationhero` announced; **CI/CD becomes the first goal.** |
| Jun 4, 00:02 → 02:14 | `master` (not `main`) confirmed · GitHub Actions minutes economics measured · license ≠ visibility · `handoff.md` written · **3 cross-doc contradictions found + resolved** · folder-rename procedure. |

---

## 3. Validated findings — by theme

Each entry: **What** was validated · **Why** · **Date** · **`Now:`** current status.

### A · Core client stack

- **A1 — One TypeScript web app, with AlphaTab as the music engine.** ✅
  - *Why:* nearly everything hard/unique in `scope.md` (read Guitar Pro GP3–GP7 + MusicXML, render drum/percussion notation, SoundFont synth playback, synced cursor, note geometry for overlays, external time provider) is **core AlphaTab functionality** (MPL-2.0). Rebuilding even half is a multi-month project. This single fact anchors the whole stack to web/TypeScript.
  - *Date:* 2026-06-02.
  - *Now:* ✅ **still holds.** AlphaTab is the locked notation engine (`docs/design-stack.md`; later AlphaTab + tonal spikes NH-196/NH-137). Caveat captured even then: AlphaTab has **no MIDI-file import yet** (track upstream).

- **A2 — Rendering split: AlphaTab + PixiJS + Web Audio clock.** 🟡
  - AlphaTab → standard-notation view; **PixiJS/WebGL** → the friendly "falling-notes" highway (drum charts are sparse, so 60fps is cheap); **Web Audio clock** → metronome, count-in, scheduling, scoring.
  - *Date:* 2026-06-02/03.
  - *Now:* 🔁 **partly unconfirmed.** The Web Audio scoring-clock principle still stands (see D1). **PixiJS and Tone.js were proposals**, never run through a later DACI — treat the specific render/audio libs as open, not locked.

- **A3 — UI framework = React + Vite, explicitly *not* Next.js.** 🟡
  - *Date:* 2026-06-02/03.
  - *Now:* 🔁 **evolved.** Front-end is still a **Vite SPA** (Next.js rejected *again* 2026-06-18, superseding NH-185). But the repo *shape* churned a lot since: plain Vite app → pnpm + **Nx** hexagonal monorepo (DACI 2026-06-09) → **Nx dropped** → pnpm workspaces, folders-in-one-app (architecture ADR 2026-06-17). See `decision-registry.md`.

### B · Rejected alternatives (and why) — the "don't re-litigate" table

All rejected 2026-06-02/03 with verified reasons:

| Option | Why rejected | `Now:` |
|---|---|---|
| **.NET MAUI / C#** | AlphaTab's .NET build ships **WPF/WinForms only (Windows-only)** — no MAUI control; you'd rebuild the integration. **A Mac cannot build the Windows app from MAUI — hard blocker.** MIDI ecosystem patchier. | ✅ stands (never revisited) |
| **Game engine — Unity** | No notation/Guitar-Pro ecosystem (only `ABCUnity`, a partial ABC renderer). MIDI input is fine (Keijiro's **Minis**). But you'd throw away AlphaTab; engines render custom note highways, not sheet music. | ✅ stands |
| **Game engine — Godot** | Same "no notation" problem **plus a known bug: Godot drops *simultaneous* MIDI events** — disqualifying for drums (kick+snare+hat at once). | ✅ stands |
| **ABCUnity + MIDI→ABC** | Two weak links: MIDI→ABC converters are melody-oriented/lossy (bad at drums); ABCUnity is a subset renderer with no drum support or note-coordinate API. Still leaves GP/synth/cursor unbuilt. | ✅ stands |
| **Next.js** | Capacitor needs a static export (`output: 'export'`) which disables SSR / API routes / server components — Next's whole value. A rhythm game has nothing to server-render. **Use Vite.** | ✅ re-confirmed 2026-06-18 |
| **Flutter / React Native** | No AlphaTab-equivalent notation ecosystem; desktop/canvas-notation second-class. | ✅ stands |

### C · Platforms & delivery

- **C1 — PWA covers almost everything for free; Capacitor is needed *only* for iOS.** ✅ One Vite build feeds: Desktop (browser Chrome/Edge, installable) · Android (PWA, Web MIDI works) · iOS/iPad (Capacitor → TestFlight + a CoreMIDI plugin). *Date:* 2026-06-02. *Now:* ✅ holds (`design-stack.md` lists Capacitor + PWA).
- **C2 — Only recurring cost = $99/yr Apple Developer** (for TestFlight onto friends' iPhones). iOS is the **only** target needing a native wrapper + a little Swift. *Date:* 2026-06-02. *Now:* ✅ holds.
- **C3 — Mac (Apple Silicon) comes free via "Designed for iPad."** Shipping the iPad app with "Make App Available on Mac" lists it in the Mac App Store for **M-series Macs only** (Intel excluded). One iPad build = iPad + iPhone + M-series Mac. *Date:* 2026-06-03 (office-hours). *Now:* ✅ holds (not yet exercised).
- **C4 — iPad-app-on-M-series-Mac MIDI: plan *against* it.** "Designed for iPad on Mac" runs iOS apps through a runtime layer; MIDI may not work reliably (matches the user's own InstaDrum-on-M5 observation). *Date:* 2026-06-03. *Now:* ✅ holds as a design assumption.
- **C5 — Android = Capacitor → Play Store APK, not PWA**, using native `android.media.midi` via a small Kotlin bridge; latency ~10–15 ms (close to iPad). USB + BLE MIDI both work. *Date:* 2026-06-03. *Now:* ✅ holds (Android is a co-primary target — see J/positioning).
- **C6 — Windows is v1 = PWA, v2 = Tauri** (three options, none clean). *Date:* 2026-06-03. *Now:* ❓ not revisited; Windows stays browser/PWA for now.

### D · MIDI & audio (banked technical gotchas)

- **D1 — Timing is decoupled from rendering** (the load-bearing insight). Web Audio runs on a separate high-priority audio thread with a sample-accurate clock (`AudioContext.currentTime`); scoring compares MIDI-hit timestamps against *that* clock, not frame timing. A cheap phone at 30fps → smoother-looking visuals suffer, but **timing/scoring stay exact. Visual jank ≠ scoring jank.** This is *why web is viable* for a rhythm game. *Date:* 2026-06-02. *Now:* ✅ architectural principle, uncontested.
- **D2 — Web MIDI = Chromium only.** Chrome/Edge/Opera (desktop **and** Android), Firefox 108+, Samsung Internet. **Not Safari (macOS or iOS)** — and all iOS browsers are WebKit, so none have it. → desktop users must use Chrome/Edge; **on iOS you must write a native CoreMIDI Capacitor plugin** (the one unavoidable native piece; no maintained off-the-shelf one). *Date:* 2026-06-02. *Now:* ✅ holds.
- **D3 — The iOS Web-MIDI shim is a dead end for production** (ancient JS engine → the `Array.from`/Tone.js bug). Capacitor's modern WKWebView removes that whole bug class — you outgrow the shim, you don't fix it. *Date:* 2026-06-02. *Now:* ✅ holds.
- **D4 — Two *different* "MIDI support" problems — never conflate them:** *(a)* MIDI → falling-notes (game view) needs only note timings + which drum (lane) → **easy everywhere, even Unity**, parse with `@tonejs/midi`; *(b)* MIDI → standard notation (sheet music) needs quantize/meter/staff/voice/beam → **hard everywhere** (music transcription). Guitar Pro / MusicXML are notation-grade; raw `.mid` → notation is lossy. *Date:* 2026-06-02. *Now:* ✅ holds (informs the song-slice / alphaTex direction, NH-137).
- **D5 — Windows audio latency:** browsers can't use ASIO (Web Audio → WASAPI) and **Electron doesn't fix it** (same Chromium audio). Real mitigations: latency calibration (in scope) + audio-clock scoring (a constant offset calibrates out, so latency hurts *feel*, not *fairness*) + `new AudioContext({ latencyHint: 'interactive' })`. Native ASIO = a maybe-product concern. *Date:* 2026-06-02/03. *Now:* ✅ holds.

### E · Persistence, sync & observability

- **E1 — "Storage ≠ a server."** Per-user private data (scores, streaks, history) can live local-first (IndexedDB via Dexie, or native SQLite in Capacitor) at $0, offline, no auth. A backend is a *product trigger.* *Date:* 2026-06-02. *Now:* ⛔ **superseded as the headline.** The **song/lesson catalogue (CMS) is the first real feature** and lives in **Neon Postgres + JSONB** (catalogue-store DACI 2026-06-09), *not* a per-user/local-first store. The local-first idea survives only for per-user data on **DynamoDB**.
- **E2 — Cross-device sync (iPad ↔ Mac) wanted *soon*** → designed for from day one. *Date:* 2026-06-03. *Now:* ✅ intent holds; mechanism changed (see E3).
- **E3 — Sync/offline layer spectrum:** hand-rolled (Dexie + `updated_at`) → **Legend-State** → **RxDB** → **PowerSync** (skip — runs a server). Leaning Legend-State or RxDB. *Date:* 2026-06-03. *Now:* 🔁 **evolved → Dexie chosen, RxDB rejected** (backend architecture ADR 2026-06-17).
- **E4 — Backend spine candidates Firebase vs Supabase** (leaning Supabase: SQL + open-source). Firestore notably does offline cache **and** cross-device sync in one SDK. *Date:* 2026-06-03. *Now:* ⛔ **both rejected.** Backend = **AWS** (catalogue-store DACI 2026-06-09); the AWS-learning goal (F) made Supabase a "nice-to-learn-later."
- **E5 — Observability (MVP) = client-side, not server SRE:** Sentry (errors) + PostHog (usage) or Firebase Analytics/Crashlytics. *Date:* 2026-06-03. *Now:* 🔁 split: **AWS CloudWatch + X-Ray** for backend SRE, **Sentry** for client JS errors (`docs/aws-learning-map.md`).

### F · AWS backend + interview-prep learning track

This is the reframe that changed the project's *purpose* (2026-06-03 ~01:04).

- **F1 — The app is a vehicle to learn AWS for interviews.** The career goal is **Sr-FE → Staff-FE**, where interviews probe **system design / system thinking**, not coding. So services that would be "overkill" for shipping become "exactly right" for learning; the backend becomes a **system-design portfolio piece**. Strong FE / CI-CD / Docker background → skip the known parts, aim energy at backend + messaging. *Now:* ✅ **the locked top priority** (project memory; this is *the* north star). Backend on AWS is confirmed.
- **F2 — Legacy AWS account (pre-2025-07-15) = genuine *Always-Free* allowances** (no $200-credit / 6-month expiry of the new free plan). This is *why* AWS is affordable here. *Now:* ✅ holds (`docs/aws-learning-map.md`; AWS account setup done).
- **F3 — Corrected free-tier ceilings** (verified, both corrections in the user's favor):
  - **CloudFront = 1 TB egress + 10M req + 2M Functions / month, Always-Free, perpetual** (not the old ~100 GB / 12-month).
  - **Cognito = 10,000 MAU** Always-Free (Lite/Essentials).
  - Lambda 1M req + 400K GB-s · DynamoDB 25 GB + 25 WCU/RCU · SQS 1M req · SNS 1M req + 1,000 emails · CloudWatch 10 alarms / 5 GB logs.
  - **No free tier — avoid for learning:** MSK (~$460–607/mo), Kinesis, NAT Gateway (~$32/mo), API Gateway (12-mo only), CloudWatch RUM, DocumentDB (~$69/mo).
  - *Now:* ✅ still the numbers in `docs/aws-learning-map.md`.
- **F4 — IaC = Pulumi (TypeScript), decided** (+ Terraform *literacy* for interviews — concepts transfer 1:1). *Now:* ✅ confirmed — first real `pulumi up` (hello-world Lambda Function URL) landed NH-150 (2026-06-14).
- **F5 — DynamoDB single-table + GSI + TTL + Streams**, with the **offline-first ↔ DynamoDB bridge**: the client lib (RxDB/Legend-State) calls two Lambda handlers — `pull(checkpoint)` → query a GSI on `(USER#sub, updatedAt > checkpoint)`; `push(changeRows)` → conditional writes (LWW); deletions flow as **soft-delete tombstones** that TTL-purge (~30 days). *Now:* 🔁 DynamoDB = **per-user data only** (catalogue is Neon Postgres). The bridge concept holds for per-user sync; client lib is now Dexie.
- **F6 — Local dev: real AWS primary, LocalStack optional.** Use real AWS for learning/interview fluency; LocalStack only for fast local/CI integration tests. *Now:* ✅ holds.
- **F7 — LEARN / SKIP map.** Build hands-on: Lambda · DynamoDB · Cognito · SQS+SNS · S3+CloudFront(OAC) · CloudWatch+X-Ray · Pulumi · the sync pull/push backend. Concept-only: Kafka (local Docker) · Kinesis/MSK/EventBridge decision matrix · VPC/NAT · burn-rate theory · Terraform HCL. Skip: FE framework/state (expert) · CI/CD basics · Docker basics · K8s · API Gateway · EC2. *Now:* ✅ holds. **One change:** the "DocumentDB / Atlas document-modeling" detour is **dropped** (Mongo/DocumentDB dropped 2026-06-09; catalogue = Neon Postgres + JSONB, talking-point only).

### G · Queues & messaging (the user's stated interview priority)

- **G1 — The hierarchy (interview gold):** **Queue (SQS)** = drop → one worker consumes → deleted ("do this work later"); **Pub/Sub (SNS)** = publish once → many subscribers each get a copy ("tell everyone"); **Log/Stream (Kafka/Kinesis/DynamoDB Streams)** = durable ordered replayable log, many readers ("a replayable history"); **Bus (EventBridge)** = route by rules. **Killer distinction:** *SQS deletes on consume (no replay); Kafka retains + replays with many independent consumers.* *Now:* ✅ a learning target (not yet built — foundation/catalogue come first).
- **G2 — DynamoDB Streams → Lambda vs SQS:** Streams = Change Data Capture (the DB *write is the event*; 24 h ordered log; fires per change) → use for reacting to sync writes; SQS = explicit enqueue, consumed-and-deleted → use for analytics / deferring slow work. They're **complementary** here. *Now:* ✅ holds.
- **G3 — SNS → SQS fan-out** teaches SQS + SNS + fan-out + DLQ + idempotency + visibility-timeout in one pattern (free: SQS 1M/mo, SNS 1M + 1,000 emails/mo). *Now:* ✅ holds.
- **G4 — Learn Kafka *off* AWS:** MSK + Kinesis have **no free tier** — don't learn streaming on AWS. Use **local Docker (Redpanda or Apache Kafka)** for the real API (partitions, consumer groups, offsets, replay), or free managed (Aiven / Confluent Cloud). Avoid CloudKarafka (discontinued) + Upstash Kafka (sunset). *Now:* ✅ holds.
- **G5 — Usage analytics pipeline:** `action → SQS → consumer λ (batch) → S3 (Parquet, dt-partitioned) → Athena (SQL)`. DynamoDB is the wrong tool (no aggregation). *Now:* ✅ holds.

### H · Auth (Cognito + PKCE)

- **H1 — PKCE is correct for SPA + Capacitor** (public clients, no secret): OAuth2 Authorization-Code + PKCE, which Cognito supports. *Now:* ✅ holds.
- **H2 — MVP = Cognito Hosted UI + Google + email/password.** Federation: Google easy; **Apple native (and required on iOS App Store if any social login)**; **GitHub is not OIDC → needs a bridge, defer past MVP.** *Now:* ✅ holds — and confirmed **Cognito, not Amplify** (Amplify abstracts AWS → kills the learning value; NH-185/NH-193, 2026-06-18). Use Cognito-in-Pulumi + Hosted UI even for the admin gate.
- **H3 — Function URL caveat:** Lambda Function URLs only support IAM or NONE auth → verify the JWT **in-handler** (`aws-jwt-verify`, `AuthType: NONE`). *Now:* ✅ holds.

### I · CI/CD, repo & GitHub Actions economics

- **I1 — Default branch is `master`, not `main`.** (The session's own injected context wrongly said `main`; reality on disk was `master`.) *Date:* 2026-06-04. *Now:* ✅ **kept `master`** deliberately (project memory; CI trust-policy/merge-queue all use `refs/heads/master`).
- **I2 — GitHub Actions minutes economics (measured from the user's own repos):**
  - **Public repos = unlimited free Actions minutes** (confirmed: `base-skill` = 5,970 runs on `ubuntu-latest`, billed $0, because public).
  - Private free tier = **2,000 min/month**. Linux CI ~7 min/run → ~250–285 runs/mo; Playwright/VR ~33 min → ~60/mo.
  - **The real trap is iOS: macOS runners bill at 10×** → ~13 iOS builds = the whole 2,000-min budget. If ever private: Linux-only CI + path filters + concurrency + caching, and **iOS builds local or self-hosted macOS**, never GitHub-hosted macOS.
  - *Date:* 2026-06-04. *Now:* ✅ facts hold; **the repo is public** (verified in registry `L7-plan-tier`), so unlimited free CI applies and merge-queue (`merge_group`) is available on GitHub Free.
- **I3 — License ≠ visibility (two independent switches).** Visibility (public/private) controls who can *see*; License controls what they may *do*. **A public repo can carry a proprietary license** ("source-available"); no license file = "all rights reserved." *Date:* 2026-06-04. *Now:* ✅ holds; repo is **public**.
- **I4 — Proposed easy-path defaults:** public + proprietary LICENSE · monorepo · IAM user keys (to unblock `pulumi up`) + OIDC for CI · **bun** as package manager. *Date:* 2026-06-04. *Now:* 🔁 mostly resolved — **public ✓**, **OIDC for deploy ✓**, but **bun was dropped → pnpm** (PM-1) and the monorepo shape became Nx-hexagonal then pnpm-workspaces (Nx dropped 2026-06-17).
- **I5 — CI/CD plan (designed, then built later):** scaffold app → CI workflow (lint/typecheck/test/build, Linux, path-filtered, concurrency-cancel, cached) → Pulumi infra (S3 private + CloudFront + OAC + GitHub OIDC) → deploy workflow (OIDC-assume → `aws s3 sync` → CloudFront invalidation) → create public GitHub repo → branch protection (require PR + CI green). *Date:* 2026-06-04. *Now:* ✅ realized and far exceeded — see the extensive CI tooling in `decision-registry.md` (Nx affected, merge queue, semgrep/gitleaks/osv, commitlint, etc.).
- **I6 — Three cross-doc contradictions found + resolved (newest wins — do not re-litigate):**

  | Topic | `stack-brainstorm.md` (earliest) | Resolution (Jun 3–4) | `Now:` |
  |---|---|---|---|
  | Backend | leaning **Supabase**, "not AWS for now" | **AWS** (learning became first-class + legacy Always-Free account) | ✅ AWS |
  | CI/CD | "**No CI/CD needed**, build locally" | **CI/CD is the priority** | ✅ CI heavily built |
  | Web hosting | Cloudflare / Netlify / GH Pages | **AWS S3 + CloudFront** | ✅ S3+CloudFront |

### J · Friendly-notation UI & feedback design

- **J1 — Primary friendly view = a horizontal "highway"** (lanes = kit pieces, rhythm reads left→right); optional vertical waterfall as an alternate. Lanes **mirror the physical kit** (cymbals/hat top, kick bottom), configurable. **Gem shape encodes articulation** (filled = normal, X = cymbals, halo = accent, small/dim = ghost). Translucent band at the now-line = the hit window. Velocity → brightness/size. *Date:* 2026-06-02/03.
- **J2 — Feedback states** (standard-notation ring + friendly-view burst): Perfect = green · Early = orange · Late = purple · Miss = gem greys out quietly · Wrong/extra hit = red ✗ in the wrongly-hit lane. Plus a **tendency meter** ("early ←|→ late" needle) so users learn if they rush, and a **combo/streak glow**. **Accessibility: always pair colour with shape + text + position.** *Date:* 2026-06-02/03.
  - *Now:* 🔁 evolved into the locked **design system** (PR #23; `docs/mockups/`, `docs/player-app-ui.md`). One concrete change: **purple/violet is avoided *as the brand*** (close-competitor read; 2026-06-13) — but purple is fine as a *functional* feedback colour (Okabe-Ito `#CC79A7`), so the "Late = purple" mapping is still usable as a score colour. Brand stays teal.
- **J3 — Positioning:** spiritual successor to Roland's discontinued **DT-1 V-Drums Tutor**; the wedge vs the incumbent practice app is **custom song upload (MIDI + Guitar Pro) + Android support.** *Date:* 2026-06-03 (office-hours). *Now:* ✅ holds (DT-1 north-star + wedge are the locked strategic refs; competitor names kept out of docs).
- **J4 — A "$2 paid tablet app" ambition** surfaced in office-hours (builder-mode primarily, with a small-revenue daydream + the AWS-skills bonus). *Date:* 2026-06-03. *Now:* ❓ de-prioritised — revenue/scale are explicitly *not* current priorities (job-hunt context; re-confirm periodically).

### K · License & IP gate (the App Store reality check)

- **K1 — AlphaTab core (`@coderline/alphatab`) = MPL-2.0 → App Store compatible**, including a **paid** app. File-level copyleft: modifications to AlphaTab *source* must stay open, but new files that merely *call* AlphaTab APIs can be proprietary (use it as an npm dependency). *Date:* 2026-06-03. *Now:* ✅ holds.
- **K2 — `sightread` (sightread.dev) = GPL-3 → App-Store-INCOMPATIBLE for a paid app. Reference patterns only — do NOT copy its code.** *Date:* 2026-06-03. *Now:* ✅ holds (reference repo at `~/Sites/sightread`).
- **K3 — The `alphaTabWebsite` fork is a *spike*, not a foundation.** Most of it is CoderLine's MPL-2.0 demo; what's the user's is the rhythm-game logic grafted on (`AlphaTabRhythmGame`) + the validated knowledge that AlphaTab works. Productionization = a **clean app the user owns**, AlphaTab as an npm dep, proven patterns ported clean-room. The fork stays read-only/off-limits. *Date:* 2026-06-02/03. *Now:* ✅ holds (`~/Sites/alphaTabWebsite`, branch `rhythm-game`; always check it for prior art before building related features).

### L · Process / meta findings (only in the transcripts)

- **L1 — Phase 0 is already partly done.** The browser prototype (`AlphaTabRhythmGame`, ~42 React+TS files) already implements much of the feature surface: `useMidiInput`, a MIDI-mapping subsystem (context/presets/settings), `circle-marker-helpers` (perfect/early/late rings), `cross-markers` (extra-hit ✗), `practice-mode-settings`, `useAutoBpm`, `media-sync-editor` + `youtube-player` + `waveform-canvas` (the mp3/video sync nice-to-have), `track-selector` (per-instrument volume), `useRhythmGameScore`. A `MIDI_MAPPING_PLAN_SUMMARY.md` exists in the fork. *Now:* ✅ the canonical prior-art reference.
- **L2 — The `design-stack.md` doc survived 2 rounds of adversarial review** (office-hours skill): score 6→8, ~30 issues caught/fixed (latency architecture, an Amplify/AWS-learning contradiction, missing Game Mode / Repeat / Latency-Compensation, a "fanfic" Tone.js claim). *Now:* historical process note.
- **L3 — The AskUserQuestion chunked-format rule was *born in these sessions* (2026-06-03).** The course-correction — move ELI10 / Recommendation / Completeness / per-option ✅❌ bullets *out* of the AskUserQuestion `question` field and *into* the response body as labeled chunks; keep `options` lean — was recognised as a **universal rule** and is now §3–§4 of the global `~/.claude/adhd-collaboration-rules.md`. *Now:* ✅ active global rule.

---

## 4. Open questions (then → now)

Every question left open in these sessions, with its current status:

| # | Open question (as of Jun 2–4) | `Now:` |
|---|---|---|
| OQ-1 | **Backend spine: Firebase vs Supabase?** | ⛔ **Closed** — neither; **AWS** (catalogue-store DACI 2026-06-09). |
| OQ-2 | **Sync layer: Legend-State vs RxDB?** | ⛔ **Closed** — neither; **Dexie** (RxDB rejected; backend ADR 2026-06-17). |
| OQ-3 | **Electron desktop: now, or browser-only until later?** | 🔁 **Deferred** — browser/PWA now; Electron not pursued; FE = Vite SPA. |
| OQ-4 | **First build step:** (A) deep review+plan · (B) iOS Capacitor+CoreMIDI · (C) extract clean Vite app from the fork? | 🔁 **Resolved differently** — became *foundation + CI/CD first*, then the **catalogue (CMS) as the first real feature**; the app is not scaffolded ahead of the catalogue spec. |
| OQ-5 | **XState for the one game-mode FSM** (idle→count-in→playing→paused→results): adopt for rigor, or skip for speed? | ❓ **Unresolved** — no later decision found. Still genuinely open. |
| OQ-6 | **AWS local creds + region** (the blocker for `pulumi up`). | ✅ **Resolved** — AWS account setup done (IAM Identity Center daily-driver); `pulumi up` landed NH-150. |
| OQ-7 | **Confirm proposed defaults** (public+proprietary / monorepo / IAM keys / bun). | 🔁 **Mostly resolved** — public ✓, OIDC ✓; **bun→pnpm**, monorepo shape changed (Nx then dropped). |
| OQ-8 | **Run `ce-doc-review` on `design-stack.md`** before building. | ✅ **Effectively done** — docs were hardened repeatedly; `design-stack.md` slimmed to implementation-only, strategy moved to private + Jira. |
| OQ-9 | **Domain** (`notation-hero.*` / `notationhero.*`). | 🔁 **Partly settled** — brand domain is **notationhero.com** (Namecheap, **not yet configured**); package namespace locked to `@notation-hero/*` (hyphen). |
| OQ-10 | **Tendency-meter / combo-glow / exact friendly-view visuals.** | 🔁 **Evolved** into the design system (PR #23, mockups). |

> **The one item still genuinely open from these sessions is OQ-5 (XState for the game-mode FSM).** Everything else was either decided later or deliberately deferred.

---

## 5. Cross-reference map — where each theme lives *now*

| Theme | Authoritative doc today |
|---|---|
| Every decision + status + enforcement | `docs/decisions/decision-registry.md` |
| Tooling stack (pnpm, Nx→dropped, ESLint, types, CI) | `docs/decisions/2026-06-09-tooling-stack-daci.md` + the 2026-06-17 architecture ADR |
| Catalogue store (Neon Postgres + JSONB; DynamoDB per-user) | `docs/decisions/2026-06-09-catalogue-store-postgres-neon.md` |
| AWS service → feature-vehicle map + free-tier numbers | `docs/aws-learning-map.md` |
| CI/CD pipeline | `docs/cicd-pipeline.md` |
| Client stack (implementation picks) | `docs/design-stack.md` |
| Locked v1 scope | `docs/feature-freeze.md` |
| Player-app UI + key-screen mockups | `docs/player-app-ui.md`, `docs/mockups/` |
| Original requirements | `scope.md` |
| The two founding brainstorms (struck-through, kept for history) | `stack-brainstorm.md`, `stack-aws-brainstorm.md` |
| Session handoff (this era) | `docs/handoff.md` |

---

## 6. What was *only* in the transcripts (not fully captured in any committed doc)

The "don't-miss-anything" payoff — items that lived in the discussion but never made it cleanly into a standing doc:

1. **The GitHub Actions minutes *measurements*** (I2: base-skill 5,970 runs / $0; alpha-drums ~7 min avg, 33 min VR; macOS 10× ≈ 13 iOS builds = 2,000 min). `docs/handoff.md` summarises these; the *method* (measuring from the user's own repos) is only in the transcript.
2. **The office-hours adversarial-review trail** (L2: 6→8 score, the specific 30 issues). Only in the transcript + the gstack design-doc copy at `~/.gstack/projects/pensive-boyd-6d17e3/…design-20260603-163704.md`.
3. **The origin of the AskUserQuestion chunked-format rule** (L3) — now a global rule, but its birth in *this* project's office-hours session is only here.
4. **The full "two MIDI problems" framing** (D4) and the **Godot simultaneous-MIDI bug** (B) — captured in `stack-brainstorm.md` (now struck-through as superseded), so this spike re-surfaces them as still-valid engineering facts independent of the stale stack decisions around them.
5. **OQ-5 (XState game-mode FSM)** — the single still-open question, easy to lose because it sat inside a now-superseded AWS doc.

---

## 7. Source artifacts & method

**Transcripts (keyed by session UUID; survive the folder rename):**
```
~/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-serene-grothendieck-fb5e67/c9615811-444a-427a-8e80-a814484b621d.jsonl
~/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-serene-grothendieck-fb5e67/9d6a169e-6435-4dea-b291-0e4cab2dc7be.jsonl   (empty)
~/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-recursing-feistel-29cb4e/fdc2c0ed-df1b-43f1-a7f1-b416c5c2fc33.jsonl     (empty / gstack-upgrade)
~/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-pensive-boyd-6d17e3/53466813-7343-411e-8e12-99a3ea7b6d33.jsonl
```

**Committed artifacts these sessions produced (all still in the repo):**
`stack-brainstorm.md` · `stack-aws-brainstorm.md` · `docs/design-stack.md` · `docs/handoff.md`
(plus the gstack design-doc copy at `~/.gstack/projects/pensive-boyd-6d17e3/…design-20260603-163704.md`).

**Method:** the two large transcripts (~1.8 MB and ~1.7 MB) were not read raw — `ce-sessions`
skeleton extraction filtered them to message-level skeletons, which were then read in full and
reconciled against the four produced docs for exact figures (free-tier numbers, Actions minutes,
version pins). The two empty sessions were read directly (12 and 21 lines).
