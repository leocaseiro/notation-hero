---
date: 2026-06-09
topic: agent-native-tooling-ci
focus: Greenfield tooling/CI stack to enforce clean architecture + DRY + real tests for an agent-driven monorepo; agents auto-discover standards from config; bullet-proof, cheap, growable CI; no test green-faking. All current choices (Bun, dependency-cruiser, folder structure) re-evaluable from scratch.
mode: repo-grounded
---

# Ideation: Agent-Native Tooling & CI Enforcement Stack

> [!WARNING]
> ⛔ **SUPERSEDED / PARTIALLY STALE.** This doc predates the **2026-06-09 decision cliff**
> (pnpm + Nx replaced Bun; the song/lesson catalog moved to **Neon Postgres + JSONB**,
> DynamoDB is per-user data only) and/or the 2026-06-10 schema lock. **Do not build from the
> struck lines below.**
>
> **Authoritative now →** `docs/decisions/decision-registry.md` (every decision + status),
> `docs/decisions/2026-06-09-tooling-stack-daci.md`, `docs/decisions/2026-06-09-catalog-store-postgres-neon.md`,
> `docs/specs/2026-06-10-catalog-schema.md`, `AGENTS.md`.
>
> _Kept for history (per "strike, don't delete"). Stale lines are ~~struck~~ with a reason._

> **Note (post-decision, 2026-06-09):** This is the brainstorming snapshot that fed the [tooling-stack DACI](../decisions/2026-06-09-tooling-stack-daci.md). The DACI's `Verification on record` section + the `Decisions` tables finalized the binding choices — notably **pnpm replaces Bun** (Bun fully dropped per F-6) and **R1's deferral of Nx was REVERSED** (Nx adopted under the complete-now override). Read this doc for the reasoning history that shaped the trade-offs; read the DACI for binding choices.

> ce-ideate run `6c6a14a0`. Generated many → critiqued all → survivors below. Feeds a per-layer DACI (Driver-Approver-Contributors-Informed).

## Grounding Context (Codebase Context)

**Project reality.** `notation-hero` is a drum-tutor rhythm game (web PWA + Capacitor), but the _real_ product is the developer's **AWS / staff-engineer learning** via a system-design portfolio. Solo + heavily AI-agent-driven. low-cognitive-load-aware (visible progress, baby commits, mechanical guardrails over vibes, low token waste). Public repo now, **private later** (CI cost will start to matter). Legacy AWS account = always-free tiers.

**Current state (all re-evaluable).** ~~Bun 1.3.11 workspaces;~~ <!-- SUPERSEDED: pnpm+Nx locked 2026-06-09; Bun fully dropped (tooling-stack-daci F-6) --> hexagonal layout `core/ adapters/ apps/ infra/` — but layers are empty `.gitkeep` and only `infra` has a real (echo-stub) `package.json`. tsconfig `strict` + `paths` aliasing; ESLint legacy (flat-disabled) + dependency-cruiser (4 forbidden rules) + tsc. Single **"CI Green"** required check, `concurrency` cancel-in-progress, ~~cache-on-`bun.lock`,~~ <!-- SUPERSEDED: lockfile is pnpm-lock.yaml, not bun.lock --> OIDC reserved for a future `deploy.yml`, iOS builds local-only.

**Proven patterns to keep/extend.** "CI Green" single-required-check (dodges skipped-check deadlock + solo self-approval trap); concurrency-cancel + path-filters + cache-on-lockfile; "every boundary rule ships an adversarial probe PR"; baby commits → `git revert`; ~~`bun.lock` text-merges across parallel agent PRs.~~ <!-- SUPERSEDED: pnpm-lock.yaml is the locked lockfile, not bun.lock -->

**Genuine gaps (highest ideation value).** No green-faking defense (no mutation testing; coverage is a note, not a gate/ratchet); no git hooks; no commit/PR hygiene; no DangerJS; no dependency health (knip/syncpack/osv); no type-coverage; no Linear.

**2026 landscape signal.** `AGENTS.md` is the cross-tool standard agents actually follow (vs `.editorconfig` they ignore), backed by **Lefthook** (one YAML) + **Biome** (one JSON). **Stryker mutation + coverage-ratchet** = the anti-green-faking combo. **Turborepo** (free Vercel cache) / **Nx** (import-level affected) for orchestration — ~~but premature at this scale.~~ <!-- SUPERSEDED: Nx ADOPTED 2026-06-09 (R1 reversed under complete-now override); not deferred --> **Knip + Syncpack + Renovate** for dep health.

## Live Findings (true in the repo today)

- 🔴 **CI is vacuously green** — `infra` scripts are `echo "…"` (exit 0); `core/adapters/apps` empty, so ~~`bun --filter='*' test|typecheck|build`~~ <!-- SUPERSEDED: stack is pnpm + Nx; use Nx affected/run-many, not bun --filter --> matches nothing → exits 0. The "bullet-proof CI" proves nothing right now. (→ Idea 4)
- 🟠 `.dependency-cruiser.cjs` `no-orphans` is `severity:"warn"` → dead modules pass. (→ Idea 9)
- 🟠 `tsconfig.base.json` uses `paths` aliasing = 2026 boundary anti-pattern; no `composite`/`references`/`isolatedDeclarations`. (→ Idea 5)
- 🟠 ESLint runs legacy (`ESLINT_USE_FLAT_CONFIG=false`), duplicating dependency-cruiser's `core/` import-ban. (→ Idea 6)
- ~~🟡 `ci.yml` triggers on `branches: [master]` — default branch appears to be `main`; if so, pushes never trigger CI (PRs still do). **Verify.**~~ <!-- SUPERSEDED: default branch is LOCKED as `master`, NOT `main`; `branches: [master]` is correct — do NOT change ci.yml triggers to `main` -->

## Ranked Ideas

### Tier 1 — Core leverage

### 1. AGENTS.md as the single machine+human standards source, drift-checked vs configs

**Description:** Adopt a root `AGENTS.md` holding the architecture ruleset (layer/import matrix, DRY/test mandates, the exact commands to run) as the one file agents reliably read. Keep it and the mechanical configs (dependency-cruiser, lint, lefthook) in sync via a tiny CI drift-check (lockfile-style). Open fork: generate AGENTS.md _from_ config, or config _from_ AGENTS.md — either way the doc and the gate cannot disagree.
**Warrant:** `external:` 2026 study — AGENTS.md is the emerging cross-tool interop standard (~32% adoption; agents follow it, but don't reliably read `.editorconfig`/multi-file ESLint). `direct:` no AGENTS.md exists; the boundary rule is duplicated in `.dependency-cruiser.cjs` + `.eslintrc.cjs` with no single source.
**Rationale:** Attacks the #1 goal — agents auto-discover standards from one reliable surface, killing the write→re-read→rewrite token loop. The drift-check stops doc/gate divergence (the classic thrash).
**Downsides:** A generated/drift-checked AGENTS.md is a small build script to own; a hand-written one can rot (hence the drift-check).
**Confidence:** 90% **Complexity:** Low **Status:** Unexplored

### 2. Lefthook pre-commit/pre-push running the exact CI commands locally

**Description:** One `lefthook.yml` whose hooks call the identical ~~`bun run` scripts~~ <!-- SUPERSEDED: pnpm + Nx scripts, not `bun run`; wire `pnpm`/`nx run` --> CI calls (lint, typecheck, depcheck, test), scoped to staged files, in parallel — so agents hit the gate before a commit reaches CI.
**Warrant:** `external:` Lefthook (single YAML, Go, parallel, no shell/lint-staged) > husky for agent-native; repo has no git hooks today.
**Rationale:** Collapses the push→red-CI→rewrite loop to a zero-network local gate — the single biggest token + CI-minute saver for agent-driven dev. Bonus: only green commits form, keeping baby-commit/`git revert` history clean.
**Downsides:** Agents must run `lefthook install` once; pre-commit scope must stay fast or it nags.
**Confidence:** 88% **Complexity:** Low **Status:** Unexplored

### 3. Test-integrity spine: coverage ratchet + Stryker mutation floor (incremental, core-first)

**Description:** ~~Vitest `coverage.thresholds` committed as a ratchet (fail if coverage _decreases_ → blocks test deletion)~~ <!-- SUPERSEDED: TODAY's runner is Node 24 built-in `node --test`; Vitest + coverage-ratchet is the DEFERRED L5 lane, not current --> + Stryker mutation testing scoped to `core/`, `--incremental`, with a mutation-score floor (fail if tests don't kill mutants → blocks assertion-free "hollow" tests).
**Warrant:** `external:` documented case — 93% line coverage masked a 58% mutation score; Stryker per-test + incremental + `breakOn`. `direct:` repo gap — coverage is a note, not a gate/ratchet.
**Rationale:** Directly answers "agents can't green-fake tests / only fix tests when they should." Ratchet stops deletion; mutation stops hollowing. Two mechanisms, phaseable (ratchet first, mutation once tests exist).
**Downsides:** Mutation adds CI minutes (mitigated by core-only + incremental); ~~requires choosing Vitest as runner.~~ <!-- SUPERSEDED: runner TODAY is `node --test` (Node 24); Vitest is the DEFERRED L5 lane — do NOT install Vitest as if current -->
**Confidence:** 92% **Complexity:** Medium **Status:** Unexplored

### 4. Fix the vacuous-green scaffold + no-empty-scripts / empty-filter guard

**Description:** A guard (CI step + lefthook) that fails if a workspace contains `.ts` but ships a stub/`echo` script, or if ~~`bun --filter` matched zero packages.~~ <!-- SUPERSEDED: bun --filter is obsolete under pnpm+Nx; use Nx affected/empty-project detection --> Distinguish "empty on purpose" via an explicit sentinel allowlist.
**Warrant:** `direct:` live bug — `infra/package.json` scripts are `echo "…"`; `bun --filter='*'` matches nothing and exits 0. CI is green over zero real checks.
**Rationale:** Cheapest, most urgent: closes a green-faking vector that needs no malice — it's the repo's default state today, and it teaches agents the wrong pattern by example.
**Downsides:** Needs a convention for legitimate empty stubs (sentinel) so it doesn't block scaffolding.
**Confidence:** 95% **Complexity:** Low **Status:** Unexplored

### Tier 2 — Architecture & growable CI

### 5. Boundaries via the module graph: workspace: protocol + package exports + TS project references

**Description:** Replace `tsconfig.paths` aliasing with real workspace packages using the `workspace:` protocol + `exports` maps + TS project references (`composite` + `isolatedDeclarations`). A layer that doesn't declare a dependency simply _cannot resolve_ an import to it. Do it now, while `core/adapters/apps` are empty `.gitkeep` (zero migration cost). dependency-cruiser stays for cycles + visualization.
**Warrant:** `direct:` repo is on the exact 2026 anti-pattern (`paths` as boundary mechanism), no project refs, layers empty. `external:` 2026 guidance — prefer `workspace:` + exports + project references.
**Rationale:** Makes illegal `core→adapters` imports _unresolvable_ (in-IDE + at typecheck), not linted-after-the-fact — defense-in-depth that costs _less_ CI time than a post-hoc checker. `composite`/`isolatedDeclarations` give 3-15× incremental builds (private-repo cost) and affected builds without Nx. Strong staff-portfolio narrative (swappable backends via real package boundaries).
**Downsides:** Restructures the import convention the monorepo is built on (currently "frozen"); biggest one-time change in the set — but free today, expensive once code lands.
**Confidence:** 80% **Complexity:** Medium **Status:** Unexplored

### 6. Biome for lint+format; retire legacy ESLint; dependency-cruiser stays as graph authority

**Description:** One `biome.json` for format + fast lint (~15× ESLint, Rust, type-inference). Shrink or remove ESLint (its only job — the `core/` import ban — duplicates dependency-cruiser). dependency-cruiser remains the boundary-graph authority (Biome can't do graph rules). Wire `biome.json` into AGENTS.md.
**Warrant:** `direct:` ESLint runs legacy/flat-disabled, duplicating dep-cruiser; no formatter exists (clean Biome adoption). `external:` Biome 2 = 2026 greenfield consensus; "don't run all three permanently."
**Rationale:** Two wins — a 15×-faster lint/format makes the local lefthook gate near-instant, and one `biome.json` is the single agent-readable config (vs the legacy-ESLint smell that rots as ESLint 9 deprecates legacy).
**Downsides:** Biome can't do type-aware or graph rules → must define an explicit division of labor (Biome=style, dep-cruiser=graph, optional thin ESLint=type-aware).
**Confidence:** 82% **Complexity:** Low-Medium **Status:** Unexplored

### 7. Self-testing guardrails: a committed probe suite of intentional violations, asserted to fail in CI

**Description:** Formalize the repo's "adversarial probe PR per rule" habit into a committed ~~`__probes__/` of intentional violations~~ <!-- SUPERSEDED: locked co-location convention forbids top-level file-type folders; co-locate probes by domain, no `__probes__/` dir --> (core→adapter import, circular dep, etc.) + a CI meta-test asserting each gate exits non-zero. If someone loosens a rule, its probe stops failing → the meta-test goes red.
**Warrant:** `direct:` extends the proven repo pattern; today the 5 dep-cruiser rules have no test that they actually fire. Serves the explicit "ruleset can GROW incrementally" goal.
**Rationale:** Guards the guards — closes the meta-gap where an agent's "fix" is to weaken a rule (a green-fake at the config layer). Each new rule adds one cheap fixture.
**Downsides:** A maintenance surface (tests that test the linters); needs a convention for where probes live and how they run.
**Confidence:** 85% **Complexity:** Medium **Status:** Unexplored

### 8. Parallel-agent merge safety: merge_group queue + CODEOWNERS-by-layer + reusable workflow

**Description:** Enable GitHub merge queue (`merge_group` trigger) so CI runs against the _post-merge_ tree; add `CODEOWNERS` partitioned by hexagonal layer; extract the duplicated ~~`checkout→setup-bun→cache→install`~~ <!-- SUPERSEDED: setup-bun no longer applies; use pnpm/action-setup + pnpm install (pnpm+Nx) --> block into a reusable workflow/composite action so adding a gate is one line.
**Warrant:** `direct:` ci.yml has no `merge_group` and duplicates the setup block across jobs; "CI Green" is reusable as the queue gate. `external:` 2026 — merge queue, reusable workflows DRY, retention→7d.
**Rationale:** The project's defining workflow is parallel agent PRs ~~merging to main~~ <!-- SUPERSEDED: default branch is `master`, NOT `main` --> — merge queue is the exact mechanism that stops two independently-green PRs from combining into a broken main, without a human gatekeeper. Reusable workflow makes "growable CI" cheap.
**Downsides:** Merge queue adds merge latency; reusable-workflow extraction refactors the file branch protection points at.
**Confidence:** 78% **Complexity:** Medium **Status:** Unexplored

### Tier 3 — Hygiene & integrations

### 9. Dependency health: Knip + Syncpack + flip no-orphans→error + osv-scanner/CodeQL

**Description:** Knip (dead files / unused exports / unused deps), Syncpack (single-version policy across workspaces) as failing CI steps; flip dependency-cruiser `no-orphans` from `warn` to `error`; add osv-scanner / CodeQL (free on public repos) for CVEs. Renovate vs Dependabot decided by bun-lockfile support (quick check).
**Warrant:** `external:` 2026 trio (Knip "catches what agents leave behind" + Syncpack + Renovate). `direct:` no dep-health exists; `no-orphans` is only `warn`.
**Rationale:** Agents are prolific debris generators (orphan files, speculative deps, version drift). A failing gate + `--fix` keeps the repo lean → lower agent context-read cost (fewer tokens) and a cleaner architecture to learn from. Part of DRY enforcement.
**Downsides:** Knip is noisy on a fresh skeleton (everything looks orphaned until apps land) → needs allowlist or gated turn-on.
**Confidence:** 85% **Complexity:** Low **Status:** Unexplored

### 10. DangerJS PR checklist: diff-shape rules

**Description:** A `dangerfile.ts` encoding mechanical PR rules: **fail** if a `*.test.ts` loses lines while its source is unchanged (the test-removal green-fake signature); **fail** if PR > ~400 changed lines (forces baby-PRs); **fail** if conventional-commit scope ≠ a real workspace; **warn** on missing issue ref. Pair with commitlint + CODEOWNERS.
**Warrant:** `external:` DangerJS programmable PR-rule patterns (2026); user explicitly requested DangerJS checklists.
**Rationale:** Closes the gap between coverage/mutation gates and _intent_ — the "deleted test lines + unchanged source = fail" rule catches the specific betrayal by diff-shape, no coverage math needed. The 400-line cap mechanically enforces the baby-commit / one-`git-revert` value.
**Downsides:** Adds a Node step per PR; thresholds are policy calls (line cap, hard-fail vs warn-with-override) the developer must set.
**Confidence:** 80% **Complexity:** Low-Medium **Status:** Unexplored

### 11. Linear ↔ GitHub: native Linear GitHub App + optional Linear MCP for agents

**Description:** Wire the native Linear GitHub App (branch→issue linking, status automation on merge) for ~80% of the value at zero config; optionally add the Linear MCP server so agents can move issues / create branches from the terminal.
**Warrant:** `external:` Linear GitHub App (free) + Linear MCP + `schpet/linear-cli` (agent-friendly).
**Rationale:** Low-effort PM integration that fits the agent-driven workflow; the MCP path lets agents update issue state without leaving the loop.
**Downsides:** Nice-to-have; GitHub issues already cover much of this. Lowest priority of the set.
**Confidence:** 70% **Complexity:** Low **Status:** Unexplored

## Rejection Summary

| #   | Idea                                           | Reason Rejected                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Nx / Turborepo adoption (now)                  | ~~Defer — <6-pkg skeleton; Nx self-hosted cache deprecated (CVE-2025-36852); bun + TS project refs give affected/incremental without overhead. Revisit Turborepo (free Vercel cache) when build time hurts.~~ <!-- SUPERSEDED: R1 REVERSED 2026-06-09 — Nx ADOPTED under complete-now override (tooling-stack-daci); Bun dropped for pnpm --> |
| R2  | Moon                                           | Polyglot value irrelevant (all-TS).                                                                                                                                                                                                                                                                                                           |
| R3  | Oxlint                                         | Correctness-only, no formatter; Biome covers more in one tool.                                                                                                                                                                                                                                                                                |
| R4  | Append-only test ledger + human sign-token     | Heavy signing ceremony; deletion vector already covered by coverage-ratchet + Danger deleted-test rule + mutation.                                                                                                                                                                                                                            |
| R5  | Full hermetic / no-internet CI + vendored deps | Over-engineered now; cheap part (osv-scanner/CodeQL) folded into Idea 9.                                                                                                                                                                                                                                                                      |
| R6  | Per-layer CI matrix                            | N× installs cost on a skeleton; single "CI Green" + good step names suffice until layers hold real code.                                                                                                                                                                                                                                      |
| R7  | $0-CI container-attestation                    | Practical core (local-first gates) = Idea 2; container wrapper adds complexity without payoff now.                                                                                                                                                                                                                                            |

## Next Step

Building a per-layer **DACI** (Driver-Approver-Contributors-Informed) from these survivors — one locked decision per layer (L1–L10). Roles are constant: **Driver** = developer + agents; **Approver** = developer; **Contributors** = this ideation's research (codebase scan, learnings, 2026 web landscape) + 6 ideation frames; **Informed** = future-self / portfolio reviewers.
