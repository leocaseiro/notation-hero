# Notation Hero — Jira reorg & whole-project plan

- **Date:** 2026-06-15 (expanded to whole-project 2026-06-16)
- **Branch:** `claude/flamboyant-shirley-1d673c`
- **Status:** Locked sequence — pending final spec review → execution
- **Scope:** **Whole project** (Catalog Preview → Alpha → Beta → M1+). Supersedes the earlier Alpha-only draft.

## 1. Why

NH dumped ~50 stories directly under a "Milestone: Alpha" epic — no visible build order, no per-area progress. Goal: a structure that makes **order + progress visible**, chunked, and sequenced to double as Leo's **AWS learning vehicle** (interview-ready fast), using the app as the showcase.

## 2. Strategy / spine

1. **Port the playable core** (notation render, transport, scoring engine, Web MIDI + mapping) from the fork — it's mature, ~12k LOC on `~/Sites/alphaTabWebsite` branch `rhythm-game`, dir `src/components/AlphaTabRhythmGame/`. This is a PORT, not a build.
2. **AWS is the main build + learning track.** Nothing AWS exists in the fork — it's all greenfield, and it's the point. The app exists to **showcase** the AWS skills.
3. **PWA-first, native later.** PWA runs on iPad/Android via Chrome now; native wrappers (Capacitor/Swift/Electron) are M1–M5.
4. **Host early** (sprint 4) so CRUD is tested on real infra and there's a live showcase ASAP.

## 3. Jira model

| Construct | Role |
|---|---|
| **Release** (fixVersion) | ship-readiness bar per milestone |
| **Component** | product/code area (cross-cutting tag) |
| **Epic** | workstream (parent of stories) |
| **Story/Task → Sub-task** | the work; carries Epic + Component + Release + Sprint |
| **Sprint** | build-order phase ("what's now" + sequence) |
| **Goal** | each sprint's epic links a goal (goal travels with the sprint); cross-cutting parent goal **"AWS interview-ready"** + **"Ship NH v1"** |

Goals are managed via the Goals GraphQL API (token-auth verified). Each sprint = a sub-goal; AWS sprints also contribute to the "AWS interview-ready" parent goal.

## 4. Releases (the ladder)

1. **`Catalog Preview`** (pre-Alpha) — sprints 1–4. Hosted catalog + admin CRUD on AWS. First showcase (AWS infra + CRUD live; no player yet).
2. **`Alpha / EAP`** — sprints 5–7b. Playable hosted app (ported player, local play+score, PWA install, Sentry, thin SQS/SNS).
3. **`Beta`** — sprints 8–12. Accounts + score history + upload + full messaging/analytics + deep SRE.
4. **`M1` (+ M2–M5 / Friendly)** — sprints 13–15. Sync, better UI, native apps.

## 5. Components (9)

`Catalog/CMS` · `Player` · `Notation-render` · `MIDI` · `Scoring` · `Infra/AWS` · `CI-CD/Tooling` · `Observability` · `Design-system`

## 6. Sprints / Goals / Build order (LOCKED)

Sprint = goal = build-order phase. Prefixed with order number (sprints carry the order; epics stay clean).

| # | Sprint = Goal | Release | Src | Key NH | AWS learned |
|---|---|---|---|---|---|
| 1 | Foundation + CI/CD | Catalog Preview | ✅ | NH-119 + L-series | — |
| 2 | Wireframes (catalog·player·score) | Catalog Preview | NEW→NH-14 | NH-133/134 +new | — |
| 3 | Temp design system | Catalog Preview | NEW→NH-14 | DS (PR #23 base) | — |
| 4 | **Catalog CRUD + infra** | Catalog Preview | BUILD | NH-126/79/123/122/118 + 107/110/121 | **Lambda·S3·CloudFront·Pulumi** |
| 5 | Player — plays a song | Alpha/EAP | **PORT** | NH-90/88/86/102/84 +101/103/105 | — |
| 6 | Sentry (FE) | Alpha/EAP | BUILD | NH-124 | (Sentry) |
| 7 | Local play + score + PWA install | Alpha/EAP | PORT+NEW | NH-15/97/92/50 | — |
| 7b | Thin SQS+SNS event slice | Alpha/EAP | BUILD | thin J-8 (NH-51 part) | **SQS·SNS (thin)** |
| 8 | Auth (Cognito) | Beta | BUILD | NH-45 | **Cognito** |
| 9 | Score history (DynamoDB) | Beta | BUILD | NH-120/58/77/74/99 | **DynamoDB** |
| 10 | User upload (S3) | Beta | BUILD | NH-49 | S3 uploads |
| 11 | Messaging + analytics (full) | Beta | BUILD | NH-54/51/31 | **SQS·SNS·DLQ·Athena·Kafka** |
| 12 | Deep SRE / SLOs | Beta | BUILD | NH-52 | **CloudWatch·X-Ray·burn-rate** |
| 13 | Offline sync — *after SLOs* | M1 | BUILD | NH-44 | DynamoDB Streams·sync |
| 14 | Better UI (hi-fi) + a11y — *after SLOs* | M1 | BUILD | NH-14/108/82 | — |
| 15 | Native (iOS·Android·desktop) — *last* | M1–M5 | BUILD | NH-46/47/48/78/128/129/130 | — |

Ordering constraints honored: messaging (11) before sync (13) & better-UI (14); deep SRE (12) after messaging; sync/UI/native after SLO setup.

## 7. Fork port plan (reusable assets → NH issues)

All on `~/Sites/alphaTabWebsite` branch `rhythm-game`, dir `src/components/AlphaTabRhythmGame/` (view via `git show rhythm-game:<path>`):

- `useRhythmGameScore.tsx` — scoring/streak/accuracy (PERFECT ±50ms, GOOD ±300ms) → **NH-97 (C-1)**, NH-99 (C-4)
- `useMidiInput.tsx` — Web MIDI, iOS-fixed, low-latency → **NH-100 (D-1)**
- `MidiRhythmGame.tsx` + `rhythm-game-helpers.ts` — note↔beat hit-matching → NH-97/100
- `midi-mapping-*.tsx` + `drum-midi-map.tsx` — GM map + presets/context → NH-111 (D-2)
- `player-controls-group.tsx` — transport/loop/count-in/metronome → NH-86/101/103/105
- `cross-markers.tsx` + `circle-marker-helpers.ts` — on-score hit/miss overlays → NH-84/85/81
- `useAutoBpm.ts` — adaptive BPM → NH-112 (E-3)
- Design notes to read first: `FEATURES.md`, `AUTO_BPM.md`, `MIDI_MAPPING_PLAN.md`, `PERFORMANCE.md`

## 8. AWS learning ladder (from `docs/aws-learning-map.md`)

Service order (the learning spine): **Lambda → DynamoDB → Pulumi → S3/CloudFront → sync → SQS/SNS messaging → Athena → CloudWatch/X-Ray → Kafka → Cognito**. Note: map is partly stale on catalog (CMS = Neon now), but the AWS order stands. Catalog (sprint 4) front-loads Lambda/S3/CloudFront/Pulumi because the catalog *requires* them (DS-8: notation blobs in S3, keys in Postgres). Legacy AWS account → Always-Free ≈ $0.

## 9. Native / platform strategy

PWA-first (sprints 1–14 are web/PWA). Native is M1–M5: iOS Capacitor + Swift CoreMIDI (NH-46/47/48), Android Kotlin (NH-78), desktop Electron (NH-128/129), Windows ASIO (NH-130). iPad/Android-via-Chrome PWA (NH-109/106) ships earlier (works on the PWA).

## 10. Execution mechanics (API with the token)

1. Components (`POST /rest/api/3/component`) + 4 Releases (`POST /rest/api/3/version`).
2. Epics (`POST /rest/api/3/issue`, issuetype Epic) — one per workstream.
3. Re-parent stories + set fixVersion + components (`PUT /rest/api/3/issue/{key}`).
4. Sprints on Scrum board 2 (already Scrum) — reconcile existing `sprint 1`/`sprint 4` ("CI/CD Setup", active); create/rename the 15 via Agile API (`/rest/agile/1.0/sprint`), move issues in.
5. Goals via Goals GraphQL (`/gateway/api/graphql`): create sprint-goals + parent goals, link each sprint's epic.
6. Cleanup (§12).

**Execute in release order** — `Catalog Preview` first (sprints 1–4), since "let's do it" starts there.

## 11. Cleanup

- **NH-1** junk epic ("Epic", empty) → delete.
- Old **milestone-epics NH-6..NH-13** → after re-parenting, repurpose/empty. Keep NH-14 (Design) + NH-15 (Local play) as real epics.

## 12. Out of scope (now)

- Exact per-issue assignment for Beta+ sprints (finalized as each sprint nears).
- "Friendly" milestone stories (NH-64/65/66/67) — map into M1/feature release later.

## Decision log

- **Auth:** API token (REST + Agile + Goals GraphQL all verified).
- **Q-B1:** all of Alpha → expanded to **whole project**. **Q-B2:** pure Jira → **Goals back in** (linked to sprints + "AWS interview-ready" parent). **Q-B3:** loose sprints. **Q-B4:** number sprints only.
- **Q-S1:** Alpha scope = +practice essentials +score%. **Q-S2:** SRE pulled in → **refined**: only Sentry-FE early; deep SRE after messaging.
- **Q-W1:** spine = port core → climb AWS ladder. **Q-W4:** thin SQS/SNS early + full later. **Q-W5:** sequence LOCKED.
- **Reorder:** Pulumi+S3 into Catalog (sprint 4); messaging (11) before sync/UI; deep SRE (12) after; sync/UI/native after SLOs. **Pre-Alpha `Catalog Preview` release added.**
