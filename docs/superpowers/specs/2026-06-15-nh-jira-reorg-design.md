# Notation Hero — Jira (NH) reorganization design

- **Date:** 2026-06-15
- **Branch:** `claude/flamboyant-shirley-1d673c`
- **Status:** Draft for review
- **Scope of this spec:** **Alpha / EAP** milestone only. Beta+ is a later, separate cycle.

## 1. Why

NH models milestones as Epics ("Milestone: Alpha/EAP", Beta, Friendly, M1–M5) with **~50 stories dumped directly under the Alpha epic** (NH-6). Result: no visible build order, no per-area progress, can't tell what's next — "it's all a bit mess". Goal: a structure that makes **progress and order visible**, chunked so it's never one big undifferentiated pile.

## 2. Model decision — Pure Jira, no Goals (for Alpha)

Structure and progress live **entirely in Jira**. **Atlassian Goals are deferred** (the Goals GraphQL API is confirmed working with our token, so we can layer Goals/sub-goals on later if wanted). Rationale: Jira already auto-rolls-up progress (Release %, Epic %, Component dashboards); Goals don't auto-roll-up, so they'd add manual overhead now for little gain.

Constructs used:

| Construct | Role | Hierarchy? |
|---|---|---|
| **Release** (fixVersion) | shippable version / ship-readiness bar | cross-cutting tag |
| **Component** | product/code area | cross-cutting tag |
| **Epic** | workstream | parent of stories |
| **Story / Task** | unit of work; carries Epic + Component + Release + Sprint | parent of sub-tasks |
| **Sub-task** | a step under a story | child of story |
| **Sprint** | build-order phase ("what's now" + sequence) | orthogonal to epics |
| **(Deferred) Goal / sub-goal** | outcome / OKR layer | addable later |

## 3. Release

- **One release:** `Alpha / EAP` — the single ship-readiness bar for Alpha.
- **[CONFIRM] Name:** `Alpha / EAP` (mirrors milestone) vs `0.1.0-alpha` (mirrors nx-release SemVer). Default: `Alpha / EAP`.

## 4. Components (9)

`Catalog/CMS` · `Player` · `Notation-render` · `MIDI` · `Scoring` · `Infra/AWS` · `CI-CD/Tooling` · `Observability` · `Design-system`

Created once via REST `POST /rest/api/3/component`; assigned per-issue via `PUT /rest/api/3/issue/{key}`.

## 5. Epics, Sprints & Build Order

**Build order (decided):** CI/CD → CRUD → Play-a-song → SRE+analytics → MIDI+score.

6 epics (5 workstreams + foundation). 5 **loose** sprints, **prefixed with the order number**; the **sprint carries the order** (epics keep stable names — reorder = rename one sprint).

| # | Sprint | Epic | Primary components |
|---|---|---|---|
| 1 | `1 · CI/CD` | Alpha · CI/CD & Infra | CI-CD/Tooling, Infra/AWS |
| 2 | `2 · CRUD` | Alpha · CRUD (Catalog/CMS) | Catalog/CMS |
| 3 | `3 · Play a song` | Alpha · Play a song | Player, Notation-render |
| 4 | `4 · SRE` | Alpha · SRE + Sentry + analytics | Observability |
| 5 | `5 · MIDI+score` | Alpha · MIDI + scoring | MIDI, Scoring |
| — | (no sprint) | Alpha · Foundation & tooling | CI-CD/Tooling |

- **Sprints:** loose — no strict dates; complete when the workstream is done. Requires a **Scrum board** (NH may be Kanban → quick UI flip; then sprints created/filled via Agile REST API).
- **Foundation epic:** holds the ✅ Done L-series tooling so finished setup work doesn't distort the Alpha %. Not in a numbered sprint. **[CONFIRM]**
- **Numbering:** sprints only.

## 6. Alpha story mapping (provisional — pending §7 scope confirm)

Each story: re-parented to its epic, tagged Component + Release `Alpha / EAP`, placed in its sprint.

- **Sprint 1 · CI/CD & Infra:** NH-119 (CI/CD+AWS) · NH-107 (Pulumi) · NH-110 (Lambda URL) · NH-120 (DynamoDB) · NH-121 (S3+CloudFront)
- **Sprint 2 · CRUD:** NH-126 (K-1 store) · NH-79 (Neon adapter) · NH-123 (K-3 API) · NH-122 (K-2 admin) · NH-118 (schema) · NH-117 (CMS approach ✅)
- **Sprint 3 · Play a song:** NH-90 (A-1 render) · NH-84 (A-2 rings) · NH-88 (B-1 load) · NH-86 (B-2 transport) · NH-102 (B-7 tempo)
- **Sprint 4 · SRE:** NH-124 (Sentry) · NH-52 (SLOs ←Beta) · NH-54 (analytics ←Beta) · NH-51 (instrumentation ←Beta)
- **Sprint 5 · MIDI+score:** NH-100 (D-1 MIDI) · NH-97 (C-1 scoring)
- **Foundation (mostly ✅):** NH-80, NH-83, NH-89, NH-91, NH-93, NH-125 · NH-96 (AGENTS.md) · NH-98 (nx release) · NH-104 (hardening) · NH-25 (decision-changelog)
- **Design — re-home?** NH-116 (`/design-shotgun` whole-app UI pass) likely belongs under the existing Design epic NH-14, not an Alpha workstream. **[CONFIRM]**

## 7. The Beta cut (tight scope — the key decision)

To keep Alpha a shippable EAP, these current-Alpha stories move **out to Beta** (re-parent off the Alpha epics; set milestone Beta):

- **Feature extras:** NH-82 (a11y) · NH-108 (dark mode) · NH-113 (save settings) · NH-112 (auto-speed) · NH-115 (practice mode) · NH-106 (Android PWA) · NH-109 (iPad shim)
- **Borderline transport** (not in brief's core): NH-85 (A-3) · NH-81 (A-4) · NH-87 (A-8) · NH-101 (metronome) · NH-103 (loop) · NH-105 (count-in) · NH-95 (display options)
- **Borderline scoring/MIDI:** NH-111 (D-2 mapping) · NH-114 (D-4) · NH-92 (C-2 score %) · NH-94 (C-3 rating) · NH-99 (C-4 streak)

**[CONFIRM] Scope cut.** Default = brief's named core only. You may want to pull a few practice essentials into Alpha (e.g. loop NH-103, metronome NH-101, count-in NH-105) and/or score-% NH-92. Flag which, if any.

## 8. SRE pull-forward

NH-52, NH-54, NH-51 (currently parent = NH-7 Beta) → re-parent to **Alpha · SRE** epic + fixVersion `Alpha / EAP`. **[CONFIRM]** Default = pull.

## 9. Execution mechanics (all via API with the token)

1. Create **components** (`POST /component`) + **release** (`POST /version`).
2. Create the **6 epics** (`POST /issue`, issuetype Epic).
3. **Re-parent** stories (`PUT /issue/{key}` set `parent`) + set fixVersion + components.
4. Ensure a **Scrum board** (UI flip if NH is Kanban) → create **5 sprints** (`POST /rest/agile/1.0/sprint`) → move issues into sprints.
5. **Beta cut** (re-parent gray-zone out of Alpha).
6. **Cleanup** (§10).

Goals: deferred (no API calls this cycle).

## 10. Cleanup

- **NH-1** junk epic (summary literally "Epic", empty) → delete. **[CONFIRM]**
- **NH-6** "Milestone: Alpha / EAP" epic → empty after re-parenting. Delete, or keep as an archived label? Beta+ milestone-epics (NH-7..NH-13) stay untouched until their later migration. **[CONFIRM]**

## 11. Open decisions to confirm (consolidated)

1. **Release name** — `Alpha / EAP` (default) vs `0.1.0-alpha`.
2. **Scope cut** — brief-core only (default) vs pull some practice/score stories into Alpha.
3. **SRE pull-forward** — yes (default).
4. **Foundation epic** — keep as 6th epic (default) vs fold Done items elsewhere.
5. **Cleanup** — delete NH-1; delete-or-archive emptied NH-6.
6. **Scrum board** — OK to add/flip to Scrum for sprints?

## 12. Out of scope (this cycle)

- Beta, Friendly, M1–M5 restructuring (later — same pattern).
- Atlassian Goals / sub-goals layer (deferred; API confirmed for when wanted).

## Decision log (this session)

- **Q-AUTH:** API token (`jira.env`, REST + Goals GraphQL both verified 200).
- **Q-B1:** Build all of Alpha at once.
- **Q-B2:** Pure Jira; skip Goals for Alpha.
- **Q-B3:** Loose sprints per workstream.
- **Q-B4:** Number sprints only (epics stay clean).
