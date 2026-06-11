# NotationHero — Parallel-Track Handoff Prompts

> [!WARNING]
> ⛔ **SUPERSEDED / PARTIALLY STALE.** This doc predates the **2026-06-09 decision cliff**
> (pnpm + Nx replaced Bun; the song/lesson catalogue moved to **Neon Postgres + JSONB**,
> DynamoDB is per-user data only) and/or the 2026-06-10 schema lock. **Do not build from the
> struck lines below.**
>
> **Authoritative now →** `docs/decisions/decision-registry.md` (every decision + status),
> `docs/decisions/2026-06-09-tooling-stack-daci.md`, `docs/decisions/2026-06-09-catalogue-store-postgres-neon.md`,
> `docs/specs/2026-06-10-catalogue-schema.md`, `AGENTS.md`.
>
> _Kept for history (per "strike, don't delete"). Stale lines are ~~struck~~ with a reason._

> Created 2026-06-05, after the feature freeze locked. Copy each fenced block into a **fresh Claude session** to run that track. Your global ADHD collaboration rules auto-load, so they're not repeated here.
>
> ~~**Dependency:** Tracks **1 (UI)**, **2 (Pipeline)**, and **4 (CMS approach)** are independent decisions → fully parallel now. Track **3 (Schema)** finalizes [song-schema.md](song-schema.md). The *later* CMS **build** waits on both Track 3 (schema) **and** Track 4 (approach); the APP **data** layer waits on Track 3. So: run all four in parallel; just don't start APP/CMS *data/build* code until those land.~~ <!-- SUPERSEDED: Track 3 (schema) is LOCKED (docs/specs/2026-06-10-catalogue-schema.md) and Track 4 (CMS approach) is decided (commit 0fe7bd1); the "neither started, run in parallel" plan graph is stale -->
>
> ~~Canonical docs (read-only inputs) all live in `~/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/` and `scope.md`.~~ <!-- SUPERSEDED: points into the stale pensive-boyd-6d17e3 worktree (pre-lock context); use docs/decisions/ and docs/specs/ -->

---

## Track 1 — Player-app UI design

```text
NotationHero — define the PLAYER-APP UI (Track 1 of a parallel plan). Drum-practice / rhythm-game PWA; spiritual successor to Roland's DT-1 V-Drums Tutor. The feature freeze is locked.

Goal: design the player app's UI — screens, navigation, settings, and the feedback visual language. Player app ONLY (the admin CMS is a separate track). You do NOT need the song-file schema for this.

Read first (absolute paths):
- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/feature-freeze.md  — esp. the rows marked 🎨 design-shotgun-gated (A-2 feedback colors, A-6 a11y palette, F-4 dark mode, C-2 per-tier score display, B-9 timeline A/B UI) and the full feature list for what views must exist.
- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/scope.md  — feedback + player-feature requirements.
- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/serene-grothendieck-fb5e67/stack-brainstorm.md  — §6 friendly-view UI design (highway + gem shapes + tendency meter + combo glow + accessibility).
- DT-1 reference screenshots: /Users/leocaseiro/Downloads/dt-1_ss_main_notation_gal.jpg (notation + live kit SVG) and /Users/leocaseiro/Downloads/dt-1_ss_game_mode_gal.jpg (friendly view + score panel).

Scope: library/song-select, main play (standard notation + per-note feedback), practice/settings modal, results/score, and the friendly view (design-gated, lands at the "Friendly" milestone). Resolve the 🎨 decisions: perfect/early/late/missed/extra visual language (note: scope wants green=perfect; fork currently uses blue — reconcile), a11y (pair color with shape + text/label; consider a feedback-color picker), dark mode keep/restyle/skip, score display (per-tier Excellent/Good/OK/Miss like DT-1?), and the timeline A/B UI.

Constraints: PWA-first; standard notation is primary (Alpha), friendly view is later; tablet-primary (iPad + Android, 44pt touch targets, landscape); keep architecture friendly-view-ready (a single renderer interface — see A-7). Suggest running /design-shotgun.

Deliverable: a UI design system + key-screen mockups + the resolved 🎨 decisions, written to docs/.
```

---

## Track 2 — GitHub pipeline + AWS setup

```text
NotationHero — set up the CI/CD pipeline + AWS access (Track 2 of a parallel plan). The feature freeze is locked; AWS depth is a primary near-term goal (job-hunt portfolio).

Goal: define and stand up the GitHub repo, CI/CD, AWS credentials, and a first Pulumi deploy.

Read first (absolute paths):
~~- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/handoff.md  — the CI/CD plan, the proposed defaults (public + proprietary LICENSE, monorepo, IAM keys for local + OIDC for CI, bun), and the GitHub-Actions-minutes facts (public = unlimited; macOS = 10×, so iOS builds local).~~ <!-- SUPERSEDED: stale worktree path; "bun" default replaced by pnpm+Nx (DACI 2026-06-09) -->
~~- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/design-stack.md  — AWS stack (Pulumi TS, Lambda Function URL, DynamoDB, S3+CloudFront+OAC), distribution plan.~~ <!-- SUPERSEDED: stale worktree path; DynamoDB-as-catalogue replaced by Neon Postgres+JSONB (DynamoDB per-user only, decision 2026-06-09) -->
- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/serene-grothendieck-fb5e67/stack-aws-brainstorm.md  — refined learning order + free-tier ceilings.

~~Scope: create the GitHub repo (public + proprietary LICENSE); monorepo layout (apps/web, infra, later packages/shared) with path-filtered CI; CI workflow (install → lint → typecheck → test → build; Linux; concurrency-cancel; cached); AWS creds (IAM user + access keys for local `pulumi up`; GitHub OIDC for CI — no secrets in Actions); Pulumi bootstrap + a first hello-world Lambda Function URL verified in CloudWatch (per design-stack.md "The Assignment"); branch protection on the default branch (require PR + green CI).~~ <!-- SUPERSEDED: layout apps/web+packages/shared replaced by locked Nx hexagonal core/adapters/apps/infra; CI test step is Node 24 `node --test` today, NOT Vitest (deferred L5); pnpm+Nx task graph, not plain CI (DACI 2026-06-09) -->

~~Constraints: bun 1.3.11; default branch = master; public repo (free Actions minutes); legacy AWS account (Always-Free tiers); iOS builds run LOCAL, never on GitHub-hosted macOS runners.~~ <!-- SUPERSEDED: `bun 1.3.11` replaced by pnpm+Nx (DACI 2026-06-09). NOTE: default branch = master, public repo, legacy AWS, iOS-builds-local are all still CORRECT — struck only because the `bun` token is on this line -->

Deliverable: a repo with green CI, AWS creds configured, and `pulumi up` deploying the hello-world Lambda — the smallest interview-tellable AWS story.
```

---

## Track 3 — Finalize the song-file schema

```text
NotationHero — finalize the song/lesson schema (Track 3 of a parallel plan). This is the shared contract the player app (reader) and the admin CMS (writer) both build to; finalizing it unblocks the APP + CMS data work.

~~Goal: turn the schema draft into a locked contract.~~ <!-- SUPERSEDED: Track 3 is CLOSED — the schema is already LOCKED in docs/specs/2026-06-10-catalogue-schema.md; do not re-run this track -->

Read first (absolute paths):
~~- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/song-schema.md  — the DRAFT to finalize (Lesson record, S3 layout, catalog API, + 5 open questions).~~ <!-- SUPERSEDED: this DRAFT was already finalized/LOCKED as docs/specs/2026-06-10-catalogue-schema.md; do not re-litigate from the stale draft -->
~~- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/feature-freeze.md  — area K (Admin/CMS), H-11 (lesson library), D-2 (MIDI-mapping presets), H-3 (DynamoDB single-table), H-10 (upload validation), and the locked sync model (shared-data; no per-user identity until M1).~~ <!-- SUPERSEDED: stale worktree path; H-3 "DynamoDB single-table" for the catalogue is wrong — catalogue is Neon Postgres+JSONB, DynamoDB is per-user only (decision 2026-06-09) -->
- The fork's mapping/format shape: /Users/leocaseiro/Sites/alphaTabWebsite/src/components/AlphaTabRhythmGame/MIDI_MAPPING_PLAN.md and FEATURES.md (track selection, "go to drum track").
- AlphaTab data model + alphaTex format (alphatab.net/docs).

Scope: resolve the 5 open questions in song-schema.md; finalize the Lesson record fields, S3 key layout, catalog API (list projection vs full record), and GSIs; confirm extensibility (the `meta` blob) + `version`/soft-delete; align `defaultMappingPresetId` with the D-2 preset structure and the file formats with H-10 validation.

~~Constraints: DynamoDB single-table (H-3); shared/global data (no per-user identity in Alpha/Beta); store raw files and parse on the client via AlphaTab (no pre-stored tick map); extensible for later /design-shotgun findings.~~ <!-- SUPERSEDED: "DynamoDB single-table (H-3)" for the lesson contract contradicts the locked Neon Postgres+JSONB catalogue store (decision 2026-06-09; DynamoDB is per-user only) -->

~~Deliverable: song-schema.md updated to status LOCKED — the contract APP and CMS both implement.~~ <!-- SUPERSEDED: already delivered — schema LOCKED as docs/specs/2026-06-10-catalogue-schema.md (2026-06-10) -->
```

---

## Track 4 — Decide the CMS implementation approach

```text
NotationHero — decide HOW to build the Admin/CMS (Track 4 of a parallel plan). The feature freeze is locked; AWS depth is a PRIMARY near-term goal (job-hunt portfolio).

~~Goal: choose the CMS implementation approach — custom-built on AWS vs headless CMS (self-hosted or SaaS) vs git/flat-file — and document the decision + rationale.~~ <!-- SUPERSEDED: Track 4 is CLOSED — CMS approach already decided (commit 0fe7bd1, Area-K CMS plan); re-running reopens a settled DACI -->

~~THE CORE TENSION: the CMS (area K) was placed in Alpha specifically as an AWS-portfolio piece — building S3 + DynamoDB + Lambda + CloudFront yourself (incl. a CloudFront-Function Basic-Auth gate) is a ranked interview showcase. A headless/SaaS CMS is faster but LARGELY bypasses that learning (it brings its own DB/backend) and may add cost or a vendor. Weigh AWS-learning value (PRIMARY) against build-speed / convenience / cost.~~ <!-- SUPERSEDED: assumes DynamoDB+Lambda as the catalogue backend; catalogue is now Neon Postgres+JSONB (decision 2026-06-09) and the approach is already decided (commit 0fe7bd1) -->

Read first (absolute paths):
~~- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/feature-freeze.md  — area K (K-1 lesson store, K-2 hosted admin SPA+CRUD w/ CloudFront-Function Basic Auth, K-3 catalog API) + the AWS portfolio-candidate ranking + the sync model.~~ <!-- SUPERSEDED: stale worktree path; area-K "lesson store" is now Neon Postgres+JSONB, not a DynamoDB catalogue (decision 2026-06-09) -->
~~- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/song-schema.md  — what the CMS manages (Lesson record + S3 files + catalog API). Track 3 finalizes this; this tooling decision can proceed in parallel.~~ <!-- SUPERSEDED: stale worktree path; "Track 3 finalizes this" is false — schema already LOCKED (docs/specs/2026-06-10-catalogue-schema.md) -->
~~- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/aws-learning-map.md  — which AWS services the CMS is meant to teach.~~ <!-- SUPERSEDED: stale worktree path; the CMS/catalogue is no longer an AWS-DynamoDB learning vehicle — catalogue lives in Neon Postgres (decision 2026-06-09) -->
~~- /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/pensive-boyd-6d17e3/docs/design-stack.md  — AWS stack (Pulumi, Lambda Function URL, DynamoDB, S3+CloudFront+OAC), free-tier posture, and App-Store license constraints (proprietary app; OSS-compatible licenses only — relevant if bundling/forking a CMS).~~ <!-- SUPERSEDED: stale worktree path; DynamoDB-as-catalogue replaced by Neon Postgres+JSONB (DynamoDB per-user only, decision 2026-06-09) -->

Evaluate at least these options, each on: AWS-learning value, cost (Always-Free-tier fit), build effort, fit for the lesson schema, and license/App-Store compatibility:
~~1. Custom-built (raw React admin + Lambda Function URL CRUD + DynamoDB + S3 + CloudFront-Function Basic Auth) — max AWS learning, free tier, more code (this is what area K currently describes).~~ <!-- SUPERSEDED: "what area K currently describes" is stale — area K is now a Neon Postgres+JSONB catalogue, not DynamoDB (decision 2026-06-09); CMS approach already decided (commit 0fe7bd1) -->
~~2. Self-hosted headless (Strapi / Directus / Payload) — less code + a real admin UI, but container hosting (Fargate/EC2 = no free tier) and its own DB bypasses the DynamoDB/Lambda learning. Check: can it store media in S3 and/or sync metadata to your DynamoDB?~~ <!-- SUPERSEDED: framed around DynamoDB-as-catalogue (now Neon Postgres+JSONB); CMS approach already decided (commit 0fe7bd1) -->
3. Managed/SaaS headless (Sanity / Contentful / Strapi Cloud) — fastest, but $ + data off-AWS (undercuts the portfolio) + vendor + ToS/license.
4. Git / flat-file (lessons as repo files + a thin editor) — simplest, free, but no dynamic catalog API + rebuild-to-publish.
~~5. Hybrid (headless admin UX, but files in S3 + metadata synced to DynamoDB) — some AWS surface + admin convenience.~~ <!-- SUPERSEDED: "metadata synced to DynamoDB" — catalogue metadata is now Neon Postgres+JSONB (decision 2026-06-09); CMS approach already decided (commit 0fe7bd1) -->

Also note how the choice resolves the DEFERRED question "does /design-shotgun cover the CMS UI?" — a headless CMS has its own admin UI, so there's nothing to design.

~~Constraints: AWS-portfolio depth is the PRIMARY goal; stay in the AWS Always-Free tier where possible; no Cognito for admin (CloudFront-Function Basic Auth already chosen); proprietary app → OSS-compatible licenses only if bundling a CMS.~~ <!-- SUPERSEDED: this constraint set framed the (now-closed) DynamoDB-backed CMS decision; catalogue is Neon Postgres+JSONB and the approach is decided (commit 0fe7bd1, decision 2026-06-09) -->

~~Deliverable: a CMS-approach decision doc (chosen approach + rationale + exactly what AWS it does/doesn't exercise + cost), written to docs/. Suggest running /office-hours or ce-brainstorm.~~ <!-- SUPERSEDED: already delivered — CMS approach decided and landed (commit 0fe7bd1, Area-K CMS plan) -->
```
