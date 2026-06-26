# Jest vs Vitest — full decision history (session archaeology + formal record)

- **Date:** 2026-06-20 · **For:** Leo (couldn't recall what was decided / whether it flipped) · **Ticket context:** NH-199 D3
- **Method:** `/ce-sessions` over **93** notation-hero sessions (keyword `jest`,`vitest`) → **24 matched**; deep-read the 5 most decision-bearing (via `ce-session-historian`); cross-checked against the committed `docs/decisions/` record. The current session is excluded from analysis per the skill's rules.

---

## TL;DR — what was actually decided

**Vitest was always the decision.** It was ratified on 2026-06-09 (DACI layer **L5**) as _the_ test runner, and reaffirmed as still-standing when the foundation was reversed (NH-194 ADR, 2026-06-17).

**Jest was never actually decided — it drifted in.** When NestJS was adopted (2026-06-16/17), `nest new` emits Jest by default, and the scaffold sessions simply **kept** it ("keep Jest, set `builder: swc`") without ever putting "Jest or Vitest for the server?" to you. So the current split (**server = Jest, client = Vitest**, per `AGENTS.md:51`) is an _un-deliberated generator default_, not a chosen position.

**→ Your D3 (2026-06-19: server tests = Vitest) RESTORES the long-standing decision.** It's not a contradiction of anything you decided — it's the first explicit decision to make the NestJS server use Vitest, closing the Jest drift. My earlier "keep Jest" recommendation was the actual deviation from the record.

|        | Standing **decision**                     | Implemented **reality** (drift)              | Your **D3**                           |
| ------ | ----------------------------------------- | -------------------------------------------- | ------------------------------------- |
| Client | Vitest                                    | Vitest ✅                                    | Vitest (unchanged)                    |
| Server | _(covered by "Vitest at L5", pre-NestJS)_ | **Jest** (nest g default, never deliberated) | **Vitest** → realigns to the decision |

---

## The 24-session footprint (every session mentioning jest/vitest, chronological)

`jX/vY` = count of jest / vitest keyword hits. Early June = Vitest-only (Nx/Vite era); Jest appears only from 2026-06-16 when the NestJS framework question lands.

| Date       | jest/vitest | Worktree                       | Desktop session name                                                                           | Session file (full path)                                                                                                                                               |
| ---------- | ----------- | ------------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-05 | j1/v25      | MAIN (master cwd)              | NotationHero — set up the CI/CD pipeline + AWS access (Track 2 of a parallel p                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/30eeab24-8ae7-4bcd-b528-23117f5aa00d.jsonl`                                                  |
| 2026-06-05 | j0/v15      | charming-curran-f72274         | /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/affectionate-dewdney-4                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-charming-curran-f72274/ce39cca4-3582-4d34-8b6d-5b2a00e331e5.jsonl`         |
| 2026-06-09 | j0/v6       | determined-perlman-6c6a14      | /ce-ideate I am interested to start this project that I want to use to learn m                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-determined-perlman-6c6a14/f035519c-efce-42d1-a77b-d9e7ff4d0f0d.jsonl`      |
| 2026-06-09 | j0/v4       | nostalgic-elbakyan-6fdd4b      | /ce-doc-review on …/worktrees/determined-perlman…                                              | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-nostalgic-elbakyan-6fdd4b/d52d880f-e481-4b65-8e3c-fbe97e71d2b5.jsonl`      |
| 2026-06-09 | j0/v5       | competent-poitras-8b8d05       | /compound-engineering:ce-work on the tooling-stack DACI Sequencing — start wit                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-competent-poitras-8b8d05/ac97c451-fbc7-47e3-9661-b04d1c8ceb66.jsonl`       |
| 2026-06-10 | j0/v8       | blissful-khorana-9fa438        | /superpowers:subagent-driven-development (DACI Step 1)                                         | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-blissful-khorana-9fa438/58876a4c-3641-459c-b546-3d94f4f29a85.jsonl`        |
| 2026-06-10 | j0/v7       | condescending-mendeleev-132bba | let's work on core/catalog from remote master. I have a plan at …                              | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-condescending-mendeleev-132bba/246d9b54-897f-448b-834f-8780a5a3d24f.jsonl` |
| 2026-06-10 | j0/v7       | gallant-bardeen-fb685c         | /ce-code-review https://github.com/leocaseiro/notation-hero/pull/8                             | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-gallant-bardeen-fb685c/0f440a58-62cf-40f8-89e4-73df29eb1fce.jsonl`         |
| 2026-06-10 | j0/v8       | musing-banach-e79536           | /ce-sessions I am very lost.                                                                   | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-musing-banach-e79536/348f110c-ed21-4460-9430-48509ba4a45f.jsonl`           |
| 2026-06-11 | j0/v35      | angry-hellman-904db0           | I am very very lost, and very frustated that I can't figure out what we have d                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-angry-hellman-904db0/964f0275-b7d6-4f34-8ba8-4dc1526147e0.jsonl`           |
| 2026-06-11 | j0/v3       | competent-wilbur-b07a8b        | Continue NotationHero pipeline setup. Repo: ~/Sites/notation-hero (branch mast                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-competent-wilbur-b07a8b/ad2c61a8-ecfe-48ab-a0c5-cbc9afde2606.jsonl`        |
| 2026-06-11 | j0/v14      | crazy-knuth-93259c             | Continue NotationHero Sprint-1 tooling. Repo: ~/Sites/notation-hero (branch ma                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-crazy-knuth-93259c/19a1cc4a-5ccb-454f-b746-748ec7e2e697.jsonl`             |
| 2026-06-12 | j0/v2       | MAIN (master cwd)              | /config                                                                                        | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/8f12561d-cc7c-4a44-b930-ce44c9e9228d.jsonl`                                                  |
| 2026-06-12 | j0/v1       | recursing-moser-f882cf         | # Prompt: evaluate file-level structure strictness and whether dependency-crui                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-recursing-moser-f882cf/f372b835-9e73-4a0b-aaf5-520498987106.jsonl`         |
| 2026-06-13 | j0/v1       | relaxed-haibt-51598a           | Hi, I want to start the plan to work on …/KAN-119                                              | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-relaxed-haibt-51598a/2021bce9-63bf-4f15-9966-baffa4ded4f6.jsonl`           |
| 2026-06-14 | j1/v1       | naughty-black-5686a7           | I had an idea to build a separate CMS, but I decided that would be a waste of                  | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-naughty-black-5686a7/8eca3424-f0e0-4b38-9109-c29c1e04a459.jsonl`           |
| 2026-06-15 | j0/v1       | competent-torvalds-c13c5c      | Hi there, I am very interested in the learning process of this app.                            | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-competent-torvalds-c13c5c/42b61b09-2ee8-4460-bd7a-ba3999c50753.jsonl`      |
| 2026-06-16 | j0/v1       | MAIN (master cwd)              | Start a /ce-doc-review findings on the Catalog CRUD plan using **Fastify**                     | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/e059b2b7-9c4d-4a93-833d-15cf847a25da.jsonl`                                                  |
| 2026-06-16 | j1/v0       | MAIN (master cwd)              | Run /ce-doc-review on the implementation plan below and walk me through the fi                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/c4c87cf2-1185-48e7-a0fb-49499f881b54.jsonl`                                                  |
| 2026-06-16 | j11/v4      | MAIN (master cwd)              | Okay, I have been investigating what is the best framework to use for my app.                  | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/7b04fa4a-2826-4baa-8715-3d24d0cb5ddc.jsonl`                                                  |
| 2026-06-17 | j1/v0       | MAIN (master cwd)              | We need to review the refactor from the super complex architecture that was sl                 | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/43d9cfdc-40f3-4451-ad59-add0e27ae0f7.jsonl`                                                  |
| 2026-06-17 | j17/v10     | MAIN (master cwd)              | I just merged the new ADR, and I would like you to plan, and implement the §1                  | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/bd31570f-d385-4d43-81f6-aa6f04f40a4b.jsonl`                                                  |
| 2026-06-19 | j3/v1       | vigilant-goldstine-b00eef      | Hi I am working on this prompt, that is almost good!                                           | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero--claude-worktrees-vigilant-goldstine-b00eef/b6511992-35c8-4491-9b2c-90a9a348693a.jsonl`      |
| 2026-06-19 | j25/v18     | MAIN (master cwd)              | Create a worktree and a Jira ticket to track this spike, please! **(THIS session — excluded)** | `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/839528a4-aa89-490a-b90f-d260ef49e434.jsonl`                                                  |

---

## Timeline (from the 5 deep-read sessions)

- **2026-06-05 — "NotationHero — set up the CI/CD pipeline + AWS access"** — Earliest test-runner work. Scaffolded a Vite + React SPA with **Vitest** from the start, no debate. Hit a real issue: `vitest@2` pulls Vite 5, colliding with the project's Vite 6 → fix was bump to **`vitest@3`** (pairs with Vite 6). Established "import `defineConfig` from `vitest/config`". Frontend-only; no backend runner discussed.
- **2026-06-11 (`angry-hellman-904db0`) — "I am very very lost…"** — A `ce-sessions` audit of which tooling decisions were well-reasoned vs rubber-stamped. The doc sweep flagged `"Vitest-as-live → deferred"` as a changed-status item. You **personally ratified** the DACI **`L5`** decision (Vitest, no-escape-hatches rigor). The assistant retracted a misleading signal: PR #8's use of `node:test` "proves nothing" because PR #8 deviated from the DACI.
- **2026-06-11 (`crazy-knuth-93259c`) — "Continue NotationHero Sprint-1 tooling"** — Implemented ESLint no-escape-hatches + commitlint. Combined root test run observed live: **"server jest 1✓, client vitest passWithNoTests"** — the split-runner reality was already passing gates.
- **2026-06-16 — "investigating what is the best framework to use"** — Fastify-vs-NestJS evaluation. A research agent flagged Jest as a NestJS con: _"the second test-runner (Jest) it drags in."_ A repo fact-check found master _didn't actually have Vitest installed yet_ at that point, so the concern "mostly dissolves." Evaluation only — no decision; ended by requesting a full architecture brainstorm.
- **2026-06-17 — "I just merged the new ADR … implement the §1 — Foundation"** — The decision-bearing scaffold session. Server (`nest new`) → **kept Jest** (_"keep Jest, set `builder: swc`"_). Client (Vite + TanStack) → **kept Vitest** (_"`vitest --passWithNoTests` keeps the runner"_). Gates green with both: _"test (server jest 1✓, client vitest passWithNoTests)"_. No reversal proposed — both runners coexist.

---

## Decisions & reversals

1. **Vitest for client/SPA (2026-06-05 → onward).** Adopted from day one, never reversed. Only change: `vitest@2`→`@3` for the Vite 6 collision.
2. **Vitest ratified as _the_ L5 runner (2026-06-09 DACI; you ratified it 2026-06-11).** This predates the NestJS decision — at that point the whole stack was Vite/Nx, so "Vitest" meant everywhere. Marked **"chosen-but-deferred"** (node `--test` ran in the interim; Vitest "lands Step 4").
3. **Jest for the server — inherited, never deliberated (2026-06-16/17).** `nest new` emits Jest; the scaffold sessions kept it. **There is no session where "Jest or Vitest for the NestJS server?" was put to you and answered.** This is the drift.
4. **NH-194 ADR (2026-06-17) kept L5 Vitest standing** even while reversing the Nx foundation: _"the non-foundation layers (L3 ESLint, L4 types, **L5 Vitest**, …) stand."_

**Net:** one consistent decision (Vitest), plus a silent server-side Jest default that no decision ever endorsed.

---

## Verbatim snippets

**2026-06-05 — CI/CD setup (Vitest version fix):**

> "two copies of Vite — `vite@6.4.3` … and `vite@5.4.21` (pulled in by `vitest@2`, which pairs with Vite 5). The mismatched `Plugin` types collide. Fix: bump to **vitest 3**, which pairs with Vite 6 → single Vite, types align."

**2026-06-11 (`angry-hellman`) — ratification + retraction:**

> "D1 — you're right, I'll throw out the PR #8 signal entirely. PR #8 deviated from the DACI, so 'PR #8 uses node:test' proves nothing."
> "the doc audit flagged: bun→pnpm, DynamoDB-as-catalog→Neon, **Vitest-as-live→deferred**"

**2026-06-16 — Fastify vs NestJS (Jest flagged as a drag-in):**

> "DI container vs functional wiring, the 2 enforcement edits Nest needs, **the second test-runner (Jest) it drags in**"
> "**test runner — mostly dissolves, and you don't actually have Vitest.**"

**2026-06-17 — Foundation implementation (the split crystallizes):**

> "reshaping into the hexagon … **keep Jest**, set `builder: swc`, add `@swc/*` …"
> "drop unused scaffold extras … **`vitest --passWithNoTests` keeps the runner**, render-testing defers to first component"
> "All U3 gates green — client typecheck, vite build … **test (server jest 1✓, client vitest passWithNoTests)**"

---

## The formal record (committed docs — full paths + lines)

- `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/nh-clean-slate-spike/docs/decisions/2026-06-09-tooling-stack-daci.md:15`
  > "**Vitest is the chosen-but-deferred L5 runner** (ratified, not 'live now')."
- `…/docs/decisions/2026-06-09-tooling-stack-daci.md:142` — "**L5 Test integrity** | **Vitest** (via `@nx/vite`) + coverage ratchet + Stryker …" _(the `@nx/vite` mechanism is now stale — Nx was dropped — but the Vitest choice stands.)_
- `…/docs/decisions/2026-06-09-tooling-stack-daci.md:18` — NH-194 supersession note: "**Kept:** … test co-location. The non-foundation layers (L3 ESLint, L4 types, **L5 Vitest**, …) **stand**."
- `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/nh-clean-slate-spike/docs/decisions/decision-registry.md:246` — "L5 test runner → **adopt Vitest at L5** (node:test runs today)."
- `…/docs/decisions/decision-registry.md:281` — "**L5-vitest** | Vitest (via @nx/vite) is the L5 test runner. **DECIDED but DEFERRED** — node --test … runs today; Vitest lands Step 4. | 💤 deferred-trigger"
- `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/nh-clean-slate-spike/AGENTS.md:51` — current contract still encodes the split: "… **Jest**. `client/` builds with **Vite** …" (server = Jest).

Related (other worktrees):

- Foundation plan that scaffolded the split (U2 server-Jest / U3 client-Vitest): `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/nh-foundation-phase0/docs/plans/2026-06-18-001-feat-foundation-phase0-nx-to-pnpm-plan.md`

---

## Open contradictions / cleanups

1. **The registry is stale.** `decision-registry.md:281` still says Vitest is "DECIDED but DEFERRED … via @nx/vite … lands Step 4." Reality: Vitest is **live** in `client/`, and **Nx is gone**. The registry should be updated (Vitest live; mechanism = Vite, not @nx/vite).
2. **Server-Jest was never your call.** Nothing in 24 sessions records you choosing Jest for the server — it's a `nest new` default. D3 is the first time the server runner is actually decided.
3. **`AGENTS.md:51` still says "Jest"** for the server — it will need updating to Vitest once D3's NestJS `swc#vitest` setup lands.

---

## Conclusion → maps cleanly onto NH-199 D3

- **The decision you couldn't recall: Vitest** (DACI L5, ratified 2026-06-09; reaffirmed standing in the NH-194 ADR).
- **It never "flipped."** The server only _looks_ like a Jest decision because the NestJS generator emits Jest and the scaffold kept it — un-deliberated.
- **D3 (server tests → Vitest, via NestJS `swc#vitest`) is therefore a re-alignment, not a reversal.** It finishes applying the standing Vitest decision to the one place (the NestJS server) where a generator default had quietly diverged.
- **Follow-ups:** update `decision-registry.md:281` (Vitest live, drop @nx/vite/deferred) and `AGENTS.md:51` (server runner → Vitest) when the D3 setup lands.
