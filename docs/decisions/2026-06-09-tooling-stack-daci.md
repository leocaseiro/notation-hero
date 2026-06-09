---
date: 2026-06-09
type: daci
topic: agent-native-tooling-ci-stack
status: Approved
approver: leocaseiro
source: docs/ideation/2026-06-09-agent-native-tooling-ci-ideation.md (ce-ideate run 6c6a14a0)
---

# DACI — Agent-Native Tooling & CI Stack

## Roles

- **Driver:** leocaseiro + AI agents (propose & implement)
- **Approver:** leocaseiro (final yes on every layer below)
- **Contributors:** ce-ideate run `6c6a14a0` — codebase scan, learnings search, 2026 web-landscape research, 6 ideation frames, + a dedicated Nx-vs-Bun compatibility verification
- **Informed:** future-self, portfolio reviewers / interviewers

## Governing principle

**Structure is set up complete & up-front, then frozen. Only the *rule set* grows** (ESLint / Nx-boundary / DangerJS / Semgrep / probe rules — added as agents find new ways to break things).

Rationale: foundational migrations (package manager, orchestrator, package boundaries, folder structure, TS project setup) are *far* cheaper while `core/ adapters/ apps/` are empty `.gitkeep` than after real code + tests + AWS wiring land. This is a deliberate **Approver override of the ideation's YAGNI-lean**: ideation rejection R1 deferred Nx/Turborepo; the Approver reversed it under the complete-now principle. The frames optimized for "minimal now"; the project optimizes for "complete now, never migrate."

## Verification on record

**Nx + Bun (researched 2026):** Bun *is* officially supported by Nx (since 19.1; the text `bun.lock` avoids the binary-lockfile bug class), and the core loop works. But pnpm was chosen because it wins on the Approver's three loudest priorities: (1) Nx generators/presets/examples are pnpm-first → agents emit pnpm-idiomatic commands by default = fewer wasted tokens; (2) pnpm's Nx code paths are the most-tested = never-migrate stability (Bun had 5+ Nx lockfile bugs in 2025, reactively patched); (3) pnpm's strict symlinked `node_modules` structurally blocks phantom/undeclared imports = a clean-architecture win. Bun and the package manager are separable — Bun may stay as a fast script runtime if desired.

## Decisions

### Foundation (structural — set up now, frozen)

| Layer | Decision | Why | Rejected / deferred |
|---|---|---|---|
| **Package manager** | **pnpm** | Agent-idiomatic Nx output, most-tested Nx paths, phantom-dep blocking (clean arch), `pnpm catalog` centralizes versions | Bun (verified to work, but loses on the 3 factors above); Bun may remain a fast runtime |
| **L1 Orchestrator** | **Nx** | Complete: affected + computation cache + generators (agents scaffold identical correct packages) + `@nx/enforce-module-boundaries` (architecture grows *as eslint rules* — matches the principle) | Turborepo (lighter but boundaries not integrated); Moon (polyglot irrelevant); bun-native (no cache/generators/affected-graph). Nx self-hosted *remote cache* plugin is deprecated (CVE-2025-36852) — use local cache + Nx Cloud free tier instead |
| **L2 Boundaries** | Real workspace packages + TS **project references** + **Nx `enforce-module-boundaries`** tags (`type:core/adapter/app/infra`) + **dependency-cruiser** kept for cycle-detection & graph viz + a committed **self-testing probe suite** (intentional violations asserted to FAIL in CI) | Illegal imports become *unresolvable* (package simply doesn't depend on the layer), not merely linted; probe suite guards against an agent loosening a rule | `tsconfig.paths` as the boundary mechanism (2026 anti-pattern — current state); eslint-plugin-boundaries / sheriff (Nx tags cover it) |
| **L3 Lint / format** | **ESLint flat config** as the growable rule engine (Nx boundaries + `@typescript-eslint` type-aware + custom architectural rules) + **Prettier** for format | "New eslint rules on the way" is the explicit growth vector; Nx is ESLint-native | Biome-as-primary (would sideline the eslint rule ecosystem the project grows); Oxlint (correctness-only). *Biome may be added later purely as a faster formatter if Prettier speed bites* |
| **L4 Types** | `strict` + `composite` + **project references** + **`isolatedDeclarations`** + a **type-coverage** floor (start ~95%, ratchet up) | Free to adopt now while empty; 3–15× incremental `.d.ts` builds (cheap CI); strong staff-portfolio signal | strict-only (current); deferring `isolatedDeclarations` (cheap now, friction later) |
| **Folders** | Keep hexagonal `core/ adapters/ apps/ infra/`, materialized as **real Nx libs/apps** each carrying a `type:` tag | Sound shape; tags drive the boundary eslint rules | Restructure (no warrant to change the shape, only to make them real packages) |

### Enforcement core (framework now; floors/rules grow)

| Layer | Decision | Why | Rejected / deferred |
|---|---|---|---|
| **L5 Test integrity** | **Vitest** (via `@nx/vite`) + **coverage ratchet** (fail if coverage decreases → blocks test deletion) + **Stryker** mutation (scoped `core/`, `--incremental`, score floor → blocks assertion-free "hollow" tests) + **fix the vacuous-green scaffold** + a **no-empty-scripts / empty-filter guard** | Directly answers "agents can't green-fake tests." Ratchet stops deletion; mutation stops hollowing (documented case: 93% coverage / 58% mutation). Scaffold fix closes a live false-green | bun:test (no coverage-threshold/Stryker integration); append-only test ledger + human sign-token (heavy ceremony, already covered) |
| **L6 PR automation** | **DangerJS** rules — deleted-test-lines + unchanged-source = **fail** (green-fake catch), PR > ~400 lines = **fail** (baby-PRs), conventional scope = workspace, missing issue ref = warn — + **commitlint** + **CODEOWNERS-by-layer** | Catches the green-fake by diff-shape (no coverage math); enforces the baby-commit / one-`git revert` value | — (rules grow over time) |
| **L7 CI cost/safety** | **`nx affected`** (cheap-CI engine) + **reusable workflow / composite action** (DRY; adding a gate = one line) + artifact **retention → 7d** + **fix the `master`/`main` trigger** + **merge-queue** (`merge_group`) + OIDC stays reserved for `deploy.yml` | Keeps proven patterns ("CI Green" single check, concurrency-cancel); merge-queue stops two independently-green parallel-agent PRs combining into a broken main | per-layer CI matrix (N× installs cost on a skeleton — defer until real code); full hermetic/no-internet CI (over-engineered now) |
| **L8 Agent standards** | **AGENTS.md generated FROM config + a CI drift-check** (config = single source of truth; doc auto-derived; build fails if they diverge) + **Lefthook** (pre-commit/pre-push running `nx affected` lint/typecheck/test on staged) + **shared config packages** (Nx-provided `@repo/tsconfig` etc.) | Highest-leverage layer; agents reliably read AGENTS.md but not multi-file configs. Drift-check stops doc/gate divergence; Lefthook collapses the write→push→red-CI→rewrite token loop to a local gate | hand-written AGENTS.md (drift risk); husky+lint-staged (lefthook is one YAML, parallel, agent-native) |

### Hygiene, dependency health & security (cost-proof, two-phase)

| Area | Decision |
|---|---|
| **Dead code / drift** | **Knip** (config now, advisory until apps land, then error) + **Syncpack** + **pnpm catalog** (centralized version pinning) + flip dependency-cruiser **`no-orphans` → error** |
| **Dependency vulns (SCA)** | **osv-scanner** (CI gate, fails build on known CVE, free) + **Dependabot alerts** (free, incl. private) + `pnpm audit` |
| **Dependency updates** | **Renovate** (grouped `packageRules` = low PR noise, automerge patches, pnpm-catalog-aware) |
| **Secrets** | **gitleaks** (always-on: Lefthook pre-commit + CI, free, private-proof) **+ GitHub native secret scanning + push protection** (free while public; **AWS partner program auto-revokes leaked keys**; auto-off on private since it needs GHAS — gitleaks carries the gap, no surprise bill) |
| **Code SAST** | **Semgrep** (always-on: fast, Lefthook + PR, free on private) **+ CodeQL** (deep, out-of-band: weekly `schedule` + push-to-main, **public-only via a `repository.visibility` workflow guard** → auto-disables on private, no GHAS bill) |

**Security principle:** for each of SAST and secrets, run a **portable free OSS tool always-on** (gitleaks / Semgrep — work on private, run locally so agents self-correct) **+ the best-in-class free GitHub-native tool while public** (native secret scanning + CodeQL — auto-disable on the private transition). **GitHub Advanced Security is never required**; coverage stays free in both the public and private phases.

| Layer | Decision | Why | Rejected |
|---|---|---|---|
| **L10 PM integration** | Native **Linear GitHub App** (branch→issue, status automation on merge) + **Linear MCP** so agents update issues from the terminal | Free, one-time, agent-friendly; Linear already in use | Custom GH-Actions↔Linear sync (overkill for solo) |

## Sequencing (build order — foundation first, while it's free)

1. **Foundation (do first, while layers are empty):** pnpm migration (swap CI `setup-bun` → `pnpm/action-setup`, regenerate lockfile, set `packageManager`, point scripts at `nx`) → `nx init` → real Nx libs/apps with `type:` tags → TS project references + `composite` + `isolatedDeclarations` → ESLint flat + Prettier → dependency-cruiser kept for cycles.
2. **Agent surface + local gate:** AGENTS.md generator + drift-check → Lefthook running `nx affected` gates → shared config packages.
3. **CI architecture:** reusable workflow → `nx affected` pipeline → fix `master`/`main` trigger → retention-7d → merge-queue → Dangerfile + commitlint + CODEOWNERS.
4. **Test integrity:** Vitest + coverage ratchet → vacuous-green fix + no-empty-scripts guard → Stryker config (core).
5. **Dep health + security:** Knip + Syncpack + pnpm catalog + `no-orphans`→error → osv-scanner + Dependabot alerts → gitleaks + native secret scanning → Renovate → Semgrep + CodeQL (guarded).
6. **Integrations:** Linear GitHub App + MCP.
7. **Self-testing probe suite:** add once the boundary rules exist (one fixture per rule; grows with the rule set).

## Open verification / first-PR checklist

- [ ] **Confirm default branch** (`main` vs `master`) and fix `ci.yml` `on.push.branches` + the OIDC trust-policy ref accordingly.
- [ ] Run the pnpm migration as the first commit (cheapest while skeleton).
- [ ] Set the **type-coverage** start floor and **coverage/mutation** start floors low; ratchet up as real code lands.
- [ ] Enable **GitHub native secret scanning + push protection** in repo settings now (public).
- [ ] Implement the **CodeQL `repository.visibility` guard** (or `gh api` guard job) so it auto-skips on private.
- [ ] Decide Stryker scope expansion (core → adapters) once adapters have logic.

## Supersedes

Reverses ideation rejection **R1** (Nx/Turborepo deferral) under the complete-now principle. All other ideation rejections (Moon, Oxlint-as-primary, append-only test ledger, hermetic CI, per-layer CI matrix) stand. CodeQL is **added** (not rejected) as the public-phase deep-SAST tier alongside Semgrep.
