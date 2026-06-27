---
date: 2026-06-09
type: daci
topic: agent-native-tooling-ci-stack
status: Approved
approver: leocaseiro
source: docs/ideation/2026-06-09-agent-native-tooling-ci-ideation.md (ce-ideate run 6c6a14a0)
---

# DACI — Agent-Native Tooling & CI Stack

> **Ratification note (2026-06-11):** every decision below was audited and ratified by
> leocaseiro — see `docs/decisions/decision-registry.md` for the full status map. One
> interim clarification: the **live test runner TODAY is Node 24's built-in `node --test`**;
> **Vitest is the chosen-but-deferred L5 runner** (ratified, not "live now"). Read Vitest
> mentions below as "the planned L5 runner," not the current one.
>
> **🔴 Partial supersession (2026-06-18, NH-194):** the **foundation** layers here are superseded by [`2026-06-17-architecture-decisions.md`](2026-06-17-architecture-decisions.md). **`L1` Nx → dropped** (ARCH-MONO-1, plain pnpm workspaces); **`L2-tags` + `L7-set-shas` + `FOLD-tagmap`** die with Nx; the **`apps/core/adapters/infra` layout + `FOLD-hex` + `FOLD-serverless`** → **`client/server/shared/infra`, hexagon as folders inside one Nest app** (ARCH-LAYOUT-1 + ARCH-HEX-1). **Kept:** `PM-1`/`F6-bun` (pnpm), dependency-cruiser (rewritten folder-level, ARCH-GUARD-1), test co-location. The non-foundation layers (L3 ESLint, L4 types, L5 Vitest, L11 observability, …) stand. See the registry's 2026-06-18 change-log entry.

## Roles

- **Driver:** leocaseiro + AI agents (propose & implement)
- **Approver:** leocaseiro (final yes on every layer below)
- **Contributors:** ce-ideate run `6c6a14a0` — codebase scan, learnings search, 2026 web-landscape research, 6 ideation frames, + a dedicated Nx-vs-Bun compatibility verification
- **Informed:** future-self, portfolio reviewers / interviewers

## Governing principle

**Structure is set up complete & up-front, then frozen. Only the _rule set_ grows** (ESLint / Nx-boundary / DangerJS / Semgrep / probe rules — added as agents find new ways to break things).

Rationale: foundational migrations (package manager, orchestrator, package boundaries, folder structure, TS project setup) are _far_ cheaper while `core/ adapters/ apps/` are empty `.gitkeep` than after real code + tests + AWS wiring land. This is a deliberate **Approver override of the ideation's YAGNI-lean**: ideation rejection R1 deferred Nx/Turborepo; the Approver reversed it under the complete-now principle. The frames optimized for "minimal now"; the project optimizes for "complete now, never migrate."

**Positioning:** this stack is built for **staff/principal interviewers at platform-heavy or fintech orgs** — depth-over-velocity signal. The 13-layer enforcement reads as rigor for that audience (CI green badge cluster, type-coverage + mutation badges, agent-native AGENTS.md, generated from config). Acknowledged trade: for product-startup-shaped interviews, the depth may need defending against an "over-engineered for solo" critique — counter with the AWS vertical slice (build-phase) which demonstrates ship-velocity inside the rigorous frame. The Portfolio surface section (below) maps which layers surface to this audience.

## Time-to-first-deploy budget (calendar check, not a gate)

The "complete now, never migrate" principle is **figurative** — a layer can always be re-scoped later if it proves expensive. This subsection keeps the calendar cost visible against the job-hunt clock without converting it into a punitive gate.

- **Target:** foundation setup (Sequencing steps 1-4 — pnpm migration through Stryker config) lands inside ~1 week of focused effort, and the first ~3 PRs are baby commits exercising the gates.
- **Friendly checkpoint (per-layer):** if a single layer takes > 1 day of solo-dev time to stand up (yak-shaving, config drift, CI red-loop debugging), pause it, note the cost in the "Open verification" checklist with a one-line `[note: spent Xh, why]` annotation, and decide: persist, simplify, or defer. Layers that genuinely earn the day pass the check.
- **Mid-window check (week 2):** by end of week 2, the AWS vertical-slice scaffolding should exist — at minimum, `apps/<fn>` + `infra/<fn>` skeletons with a placeholder handler deployable to AWS via Pulumi. If still wiring L5-L9 tools at end of week 2, slice work is being crowded out — pause new tool wiring and start the slice now. L5-L9 can land around it. This catches the "tools work expanded into slice time" failure mode before the 4-week hard pivot fires.
- **Hard pivot signal:** if no AWS vertical slice is live 4 weeks after foundation start, pause adding new layers (L9+ stops growing) and ship the AWS slice with whatever's wired. The pipeline can grow around the slice afterward; recruiter-clickable demo wins over a half-built portfolio with sophisticated tooling.

## Maintenance budget (weekly cost ceiling)

Solo dev background load is the silent killer of momentum. Every tool added (Renovate PRs, Stryker reports, 4 vulnerability scanners, drift-check, ratchet auto-blocks) generates _ongoing_ work — separate from the upfront setup cost (Time-to-first-deploy budget above).

- **Target:** ≤ **2 hours per week** on tool triage (PR reviews, alert review, drift fixes).
- **Per-tool rough estimate:**
  - **Renovate PRs** (grouped, automerge `lockFileMaintenance` only): ~30 min/wk for patch-batch reviews
  - **Dependabot + osv-scanner + Semgrep + CodeQL combined alerts:** ~1 h/wk for triage (most should resolve via Renovate or be no-ops on a small repo)
  - **Knip + Syncpack + dep-cruiser drift:** ~10 min/wk steady-state once configured
  - **Stryker reports:** review-on-demand only (when a PR introduces or removes a behavior-bearing test)
  - **AGENTS.md drift-check:** zero steady-state (only fires when config and doc fall out of sync)
- **Foundation window exemption (week 1-2):** weeks 1-2 typically run **4-6 h/wk** total (foundation setup + first-alert noise from each tool's initial scan). The 2 h/wk steady-state target applies from **week 3+**. Don't treat week-1 noise as a signal to demote tools that haven't yet stabilized.
- **Friendly checkpoint (4-week rolling window):** if a single tool's **4-week rolling average exceeds 30 min/week** (starting from week 3), demote it to "add when first pain felt" (move to Deferred section). Tools that genuinely earn the time stay. Rolling-window framing handles the spiky-load reality (5h-then-0h alternation averages over budget but never trips a consecutive-weeks trigger).
- **Hard re-evaluation signal (4-week rolling window):** if total maintenance **4-week rolling average exceeds 3 h/wk** (from week 3+), pause adding new tools (L9+) and audit existing. ALSO fires immediately if any single calendar week exceeds **4 h** (single-week-spike trigger — protects against pattern that the rolling average smooths out).

Refine the 2h target as the actual rhythm becomes clear.

## When this principle applies (and when it breaks)

The "complete now, never migrate" override is bounded — future "let's add upfront" decisions get tested against criteria, the principle is re-evaluated if a falsification signal fires, and there are honest conditions where migration becomes mandatory anyway.

**Override criteria (Approver-override of YAGNI requires at least 2 of 3):**

1. **Structural lock-in:** the choice locks file layout, import topology, or build-graph shape; retrofitting later requires touching N+ packages (foundation migrations are O(packages) to retrofit; rules are O(1) to add).
2. **Retrofit > 1 day of solo time:** standing it up later costs more focused hours than standing it up now.
3. **Differentiating portfolio signal:** the choice produces output that a depth-over-velocity interviewer would call out as ABOVE-AVERAGE — type-coverage > 95%, mutation-score badge, generated AGENTS.md with prose rationale, named architectural enforcement (e.g., `nx affected` graph render, dep-cruiser graph viz, probe-suite results). **Generic CI-pass badges (lint green, tests passing, CVE-clean) do NOT count** — those are table stakes, not signal. (Round-2 tightening: the original "any visible badge/URL" framing was too loose; almost every dev tool produces SOME badge, which made this criterion auto-pass for every future tool.)

If a future layer satisfies fewer than 2, default back to YAGNI (add when first pain felt). Document the test result inline in the DACI table when admitting a new layer.

**Falsification signals (any one fires → re-evaluate the override):**

- Nx Cloud free-tier compute-credit cap exhausted before vertical slice 5.
- First-PR cliff exceeds 3 days of yak-shaving (per Time-to-first-deploy budget above).
- First 3 vertical slices ship measurably slower with Nx than the same slices would without (informal velocity check).
- Agent first-try compliance on the `isolatedDeclarations` explicit-return-type rule drops below 80% across the 5-PR measurement window AND classification shows category (1)+(2) > 50% (see F-1 addendum). Signals AGENTS.md isn't communicating; the L4 rule and the L8 drift-check are both implicated.

**Forced-migration conditions (honest about when the freeze breaks anyway):**

- **Ecosystem shift:** Biome / Oxlint gain feature parity with ESLint AND become the agent-emitted default; OR Bun runtime hits node parity AND Lambda runtimes ship Bun-supported.
- **Employer-stack alignment:** new role requires a different stack and the portfolio repo gets reshaped to match.
- **Fundamental pivot:** solo → team OR product pivot that breaks the hexagonal layer assumption.

**Expected-value check (round-2 review):** the override's load-bearing math assumes P(forced migration) is small. **In job-hunt context, employer-stack alignment is probably the MOST LIKELY** forced-migration trigger — getting hired into a different stack within 6 months falsifies "never migrate" by default. The upfront cost is paid TODAY regardless, so at high P(forced migration) the override's expected-value collapses. **Concrete check at job-offer time:** audit whether the new role's stack matches notation-hero's. If not, **treat notation-hero as a completed portfolio reference** — don't keep investing in changes; the depth-signal job is done, ship-velocity inside the new role's stack is the new game.

"Never migrate" is a target, not a guarantee.

## Portfolio surface (what an interviewer actually sees)

Per the Positioning note (staff/principal at platform-heavy / fintech orgs), an interviewer scans the repo in ~10 minutes. The artifacts they actually touch:

1. **README.md** — architecture diagram (hexagonal layers + AWS topology), tooling badges (CI green, type-coverage, mutation score, Semgrep clean, deploy status), Linear/issue links.
2. **Deployed URL** — the live AWS vertical slice (CloudFront → API Gateway → Lambda → DynamoDB). Highest-leverage artifact for a 10-minute scan; recruiter-clickable.
3. **Representative `core/` file** — a domain entity or use-case showing clean-arch separation (no AWS SDK imports, pure TypeScript with explicit return types from `isolatedDeclarations`).
4. **Representative `adapters/aws-*/` file** — an AWS-implementation file showing the ports-and-adapters pattern in action (implements a core interface, AWS SDK only here).
5. **AGENTS.md** — the agent-native signal. Generated from config with prose rationale; demonstrates an agent-friendly stack.

**Surface map (which L# surfaces, where):**

| Layer                                                         | Surfaces?                       | Where it shows up                                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1 Nx (orchestrator)                                          | Yes                             | README architecture diagram; affected-graph link                                                                                                                                                                                                          |
| L2 Boundaries (Nx tags + dep-cruiser + probe suite)           | Yes                             | Representative `core/` file (clean-arch signal); dep-graph render in README                                                                                                                                                                               |
| L3 ESLint + Prettier                                          | Yes                             | CI lint badge                                                                                                                                                                                                                                             |
| L4 `isolatedDeclarations` + project refs + type-coverage      | Yes                             | type-coverage badge; README "X% type-coverage"                                                                                                                                                                                                            |
| L5 Vitest + coverage ratchet + Stryker                        | Yes                             | coverage badge + mutation badge                                                                                                                                                                                                                           |
| L6 DangerJS + commitlint + CODEOWNERS                         | No                              | Internal PR process (not visible in scan)                                                                                                                                                                                                                 |
| L7 CI `nx affected` + merge-queue + OIDC                      | Partial                         | CI green badge surfaces; affected-graph is internal                                                                                                                                                                                                       |
| L8 AGENTS.md generated from config + drift-check + Lefthook   | Yes                             | AGENTS.md itself (linked from README) — agent-native signal                                                                                                                                                                                               |
| L9 Knip / Syncpack / Dependabot / gitleaks / Semgrep / CodeQL | Yes                             | Security badges cluster (CodeQL, Semgrep, Dependabot)                                                                                                                                                                                                     |
| L10a Linear MCP                                               | No                              | Internal workflow                                                                                                                                                                                                                                         |
| L10b Linear GitHub App (deferred)                             | Partial                         | Linked tickets visible in PR descriptions when wired                                                                                                                                                                                                      |
| L11 Sentry (client)                                           | No                              | Internal observability                                                                                                                                                                                                                                    |
| L12 Typed env + `.nvmrc` + a11y + `size-limit`                | Partial                         | Lighthouse score on deployed URL (a11y)                                                                                                                                                                                                                   |
| L13 harnesses (deferred)                                      | Conditional — post-trigger only | Storybook static site (deployed) + Playwright CI badge ONLY IF a trigger fires before portfolio review. For an AWS-first job hunt where the deployed-URL artifact (#2) is the primary recruiter signal, L13 surface is bonus, not a planned contribution. |

Use the surface map to decide when admitting a future layer: if it doesn't surface AND retrofit cost is < 1 day, default back to YAGNI (per "When this principle applies").

## Verification on record

**Nx + Bun (researched 2026):** Bun _is_ officially supported by Nx (since 19.1; the text `bun.lock` avoids the binary-lockfile bug class), and the core loop works. But pnpm was chosen because it wins on the Approver's three loudest priorities: (1) Nx generators/presets/examples are pnpm-first → agents emit pnpm-idiomatic commands by default = fewer wasted tokens; (2) pnpm's Nx code paths are the most-tested = never-migrate stability (Bun had 5+ Nx lockfile bugs in 2025, reactively patched); (3) pnpm's strict symlinked `node_modules` structurally blocks phantom/undeclared imports = a clean-architecture win. Bun is **fully dropped** (pnpm only) — mixing bun + pnpm in one repo creates two ways to run scripts, which confuses agents and new devs (review finding F-6).

## Decisions

### Foundation (structural — set up now, frozen)

| Layer                | Decision                                                                                                                                                                                                                                                                                                                                   | Why                                                                                                                                                                                                                                                                                                                                                                    | Rejected / deferred                                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Package manager**  | **pnpm**                                                                                                                                                                                                                                                                                                                                   | Agent-idiomatic Nx output, most-tested Nx paths, phantom-dep blocking (clean arch), `pnpm catalog` centralizes versions                                                                                                                                                                                                                                                | Bun (verified to work, but loses on the 3 factors above); **Bun fully dropped** — bun+pnpm in one repo = ambiguity for agents + onboarding (F-6)                                                                                                   |
| **L1 Orchestrator**  | **Nx**                                                                                                                                                                                                                                                                                                                                     | Complete: affected + computation cache + generators (agents scaffold identical correct packages) + `@nx/enforce-module-boundaries` (architecture grows _as eslint rules_ — matches the principle)                                                                                                                                                                      | Turborepo (lighter but boundaries not integrated); Moon (polyglot irrelevant); bun-native (no cache/generators/affected-graph). Nx self-hosted _remote cache_ plugin is deprecated (CVE-2025-36852) — use local cache + Nx Cloud free tier instead |
| **L2 Boundaries**    | Real workspace packages + TS **project references** + **Nx `enforce-module-boundaries`** tags (`type:core/adapter/app/infra`) + **dependency-cruiser** kept for cycle-detection & graph viz + a committed **self-testing probe suite** (intentional violations asserted to FAIL in CI)                                                     | Illegal imports fail on **two axes**: (a) pnpm's strict symlinked `node_modules` refuses to resolve packages not in `dependencies` (build-time), and (b) Nx `enforce-module-boundaries` ESLint rule fails tag-violating imports even when the dep is declared (lint-time in CI + Lefthook). Both layers required. Probe suite guards against an agent loosening a rule | `tsconfig.paths` as the boundary mechanism (2026 anti-pattern — current state); eslint-plugin-boundaries / sheriff (Nx tags cover it)                                                                                                              |
| **L3 Lint / format** | **ESLint flat config** as the growable rule engine (Nx boundaries + `@typescript-eslint` type-aware + custom architectural rules) + **Prettier** for format                                                                                                                                                                                | "New eslint rules on the way" is the explicit growth vector; Nx is ESLint-native                                                                                                                                                                                                                                                                                       | Biome-as-primary (would sideline the eslint rule ecosystem the project grows); Oxlint (correctness-only). _Biome may be added later purely as a faster formatter if Prettier speed bites_                                                          |
| **L4 Types**         | `strict` + `composite` + **project references** + **`isolatedDeclarations`** + a **type-coverage** floor (start ~95%, ratchet up)                                                                                                                                                                                                          | Free to adopt now while empty; 3–15× incremental `.d.ts` builds (cheap CI); strong staff-portfolio signal                                                                                                                                                                                                                                                              | strict-only (current); deferring `isolatedDeclarations` (cheap now, friction later)                                                                                                                                                                |
| **Folders**          | Keep hexagonal `core/ adapters/ apps/ infra/`, materialized as **real Nx libs/apps** each carrying a `type:` tag. **Tag map:** `core/` → `type:core`, `adapters/` → `type:adapter`, `apps/` → `type:app`, `infra/` → `type:infra`. **Serverless functions split per-Lambda into two Nx projects** — see "Serverless project layout" below. | Sound shape; tags drive the boundary eslint rules                                                                                                                                                                                                                                                                                                                      | Restructure (no warrant to change the shape, only to make them real packages)                                                                                                                                                                      |

### Enforcement core (framework now; floors/rules grow)

| Layer                  | Decision                                                                                                                                                                                                                                                                                               | Why                                                                                                                                                                                                   | Rejected / deferred                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **L5 Test integrity**  | **Vitest** (via `@nx/vite`) + **coverage ratchet** (fail if coverage decreases → blocks test deletion) + **Stryker** mutation (scoped `core/`, `--incremental`, score floor → blocks assertion-free "hollow" tests) + **fix the vacuous-green scaffold** + a **no-empty-scripts / empty-filter guard** | Directly answers "agents can't green-fake tests." Ratchet stops deletion; mutation stops hollowing (documented case: 93% coverage / 58% mutation). Scaffold fix closes a live false-green             | bun:test (no coverage-threshold/Stryker integration); append-only test ledger + human sign-token (heavy ceremony, already covered) |
| **L6 PR automation**   | **DangerJS** rules — deleted-test-lines + unchanged-source = **fail** (green-fake catch), PR > ~400 lines = **fail** (baby-PRs), conventional scope = workspace, missing issue ref = warn — + **commitlint** + **CODEOWNERS-by-layer**                                                                 | Catches the green-fake by diff-shape (no coverage math); enforces the baby-commit / one-`git revert` value                                                                                            | — (rules grow over time)                                                                                                           |
| **L7 CI cost/safety**  | **`nx affected`** (cheap-CI engine) + **reusable workflow / composite action** (DRY; adding a gate = one line) + artifact **retention → 7d** + **fix the `master`/`main` trigger** + **merge-queue** (`merge_group`) + OIDC stays reserved for `deploy.yml`                                            | Keeps proven patterns ("CI Green" single check, concurrency-cancel); merge-queue stops two independently-green parallel-agent PRs combining into a broken main                                        | per-layer CI matrix (N× installs cost on a skeleton — defer until real code); full hermetic/no-internet CI (over-engineered now)   |
| **L8 Agent standards** | **AGENTS.md generated FROM config + a CI drift-check** (config = single source of truth; doc auto-derived; build fails if they diverge) + **Lefthook** (pre-commit/pre-push running `nx affected` lint/typecheck/test on staged) + **shared config packages** (Nx-provided `@repo/tsconfig` etc.)      | Highest-leverage layer; agents reliably read AGENTS.md but not multi-file configs. Drift-check stops doc/gate divergence; Lefthook collapses the write→push→red-CI→rewrite token loop to a local gate | hand-written AGENTS.md (drift risk); husky+lint-staged (lefthook is one YAML, parallel, agent-native)                              |

> **Clarification (2026-06-15, NH-16 — leocaseiro):** the L6 row's "PR > ~400 lines = **fail** (baby-PRs)" means the **baby-COMMIT** discipline — many small, green, revertable commits within a PR — **not** a hard PR-size cap. Shipped v1 (`docs/specs/2026-06-15-pr-merge-checklist.md`) makes PR-size a **soft `warn:` self-attest** checklist item, never a blocking fail; large cohesive refactors are fine. The green-fake catch (deleted-test-lines + unchanged-source) stays the L6 hard gate to build in v2.

### Implementation detail (layer-level — round-2 review)

These paragraphs make L2/L4/L5/L6/L7/L8 implementable. They don't change decisions EXCEPT F-1 (`isolatedDeclarations` measurement), which is substantially revised in the F-1 addendum in Review resolutions below — L4's original "5-10% LOC priced in" framing is superseded by the 3-bucket classification + measurement window. Everything else pins down mechanism, cost, and failure modes flagged by the round-1 review.

**L2 — Probe suite (shape, obsolescence, cost):**

- **Shape:** one Vitest spec per dep-cruise / boundary rule, under `tooling/probes/`. Each programmatically invokes the ESLint or dep-cruise API on a fixture file and asserts at least one error of the expected rule ID. Runs in the standard `test` target so Lefthook + CI both exercise it.
- **Obsolescence guard:** each probe carries an inline `// rule:<id>` comment naming the rule it tests. CODEOWNERS requires the rule-author to co-review probe changes; a DangerJS rule fails any PR that inverts a probe assertion without a corresponding rule-config diff in the same PR (prevents probes silently going green when the rule regresses).
- **Cost:** expected <100 LOC initially. Agents update probes when adding/changing rules per the AGENTS.md probe-maintenance convention (drift-checked by L8 generator).

**L4 — Declaration emit pipeline:**

Vitest (`@nx/vite`) uses esbuild and does NOT emit `.d.ts`. The 3-15× `isolatedDeclarations` speedup only materializes when a real declaration-emit step runs. Each library package gets a `build:dts` Nx target running `tsc -b --emitDeclarationOnly` (Vite/esbuild handles JS, tsc handles `.d.ts`), with `dependsOn` wired so downstream packages consume cached upstream declarations. Cache `dist/types/` as an Nx output.

The `build:dts` tsconfig (typically `tsconfig.build.json` extending base) **excludes** `**/*.{test,spec,stories,e2e,fake}.{ts,tsx}` so co-located tests/stories/fakes don't flow into the declaration emit (otherwise `isolatedDeclarations` would either fail on test files lacking explicit return types on every export OR emit unwanted `.d.ts` files for test modules). AGENTS.md documents this so agents emit the right tsconfig pair (base for typecheck, build for emit).

**L6 — DangerJS first-use trigger rules:**

In addition to the green-fake catch and PR-size cap, DangerJS runs "first-use trigger" rules that surface deferred-harness prompts on the PR that introduces a new shape. Comments are **warnings** (do not fail the build) — they remind the developer and the agent without blocking.

- **First UI component:** if the PR adds a file matching `**/*.tsx` AND no `*.tsx` files existed before, comment: `🚨 First UI component detected. Time to scaffold Storybook? See "Deferred — awaiting first-use trigger" + L13.`
- **First E2E test:** if the PR adds a file matching `**/*.e2e.{ts,tsx}` or any file under `e2e/**` AND none existed before, comment: `🚨 First E2E test detected. Time to scaffold Playwright? See "Deferred" + L13.`
- **First AWS-adapter integration test:** if the PR adds a file matching `adapters/aws-*/**/*.integration.test.ts` AND none existed before, comment: `🚨 First AWS-adapter integration test detected. Time to scaffold LocalStack docker-compose? See "Deferred" + L13.`
- **First PR opened on the GH repo:** if `danger.github.pr.number === 1`, comment: `🚨 First PR detected. Time to link the GH repo to Linear (L10b Linear GitHub App) + adopt branch naming LEO-<n>-<slug>? See "Deferred".`

Implementation specifics (round-2 hardening):

- **Glob tightening (avoid false-fires on tests/configs):** the "first UI component" rule matches `**/*.tsx` MINUS `**/*.{test,stories,e2e}.tsx` MINUS `.storybook/**` MINUS `**/dangerfile.tsx`. "First E2E" matches files specifically under `e2e/**` OR ending `.e2e.{ts,tsx}` AND under a project's `src/`. Document the exclusion list in AGENTS.md.
- **Existing-file count must subtract just-added files:** each rule reads `danger.git.created_files`, intersects with the file-pattern, AND counts matching files in the current tree via `git ls-files` — then **subtracts** the just-created files from the count. The trigger fires only when the remainder is zero. (A naive count-only check never fires after the first .tsx ever lands, because `git ls-files` at the PR HEAD already includes the newly-added file.)
- **Concurrency-safe persisted flag (avoid double-fires on parallel PRs + rebase/squash erasure):** instead of relying solely on tree state, persist a committed `tooling/first-use-flags.json` tracking which triggers have already fired. The rule fires when (flag is unset) AND (new files match the pattern). On merge, set the flag. This survives squash/rebase/refactor-delete-readd cycles AND resolves parallel-PR races naturally (first-to-merge sets the flag; second-to-rebase sees flag set and skips).
- **"First PR" rule replacement:** instead of fragile `danger.github.pr.number === 1` (breaks if PR #1 is closed-without-merge, undefined in `merge_group` replay), check "no merged PRs exist in repo history" via `gh api repos/${{ github.repository }}/pulls?state=closed --jq 'length'`. Persist a `first-pr-fired` flag once it fires.
- The rule set grows whenever a new layer is deferred (per the "first-pain wins" pattern — adding a deferral means adding its trigger + persisted flag).

**L5 — Stryker scope + cache wiring:**

- Defer Stryker config until the first behavior-bearing `core/` function with ≥1 covered test exists (the `tooling/floors.json` slot for mutation can be reserved with `null` until then — keeps the schema present, the metric inactive).
- When wired: declare `.stryker-tmp/incremental.json` as an Nx output for the mutate target AND exclude it from inputs. Nx-affected gates whether the target runs; Stryker `--incremental` gates what it mutates inside that run — the two independent caches must not invalidate each other.

**L7 — `nx affected` SHA wiring + cost ceilings:**

- Use `nrwl/nx-set-shas@v4` (or explicit `NX_BASE`/`NX_HEAD` env wiring) inside the reusable workflow so `nx affected` gets correct base SHAs on `pull_request`, `push: branches: [master]`, AND `merge_group` events. Without it, `nx affected` silently defaults to "everything affected" and the cheap-CI savings evaporate (CI passes but at full cost — a silent regression).
- **Nx Cloud free tier has a monthly compute-credit cap**; if exhausted, fall back to local-cache-only (still works) — do NOT treat Nx Cloud as a hard dependency. Monitor usage in the first 30 days; if the cap proves insufficient, consider self-hosting an S3-backed cache.
- **`merge_group` requires GitHub plan tier supporting merge queues** (Free for public repos; Team or higher for private). Verify the plan tier supports `merge_group` before wiring Sequencing step 3 — on a private Free-tier repo, downgrade to branch-protection + linear history + required reviews until plan upgrade.

**L8 — Agent-surface contracts:**

- **AGENTS.md generator output:** the generator MUST emit prose rationale per rule (not just rule names); source config files MUST carry inline comments explaining "why"; the CI drift-check MUST fail if AGENTS.md is regenerated without the source config also changing in the same PR. Without this, an agent can "fix" a drift-check by regenerating AGENTS.md without addressing the underlying rule (silently disabling the documentation contract).
- **Lefthook + `nx affected` semantics:** pre-commit runs `nx affected --uncommitted` on staged files (best-effort fast feedback — may miss cross-project breakage). Pre-push runs `nx affected --base=origin/master --head=HEAD` to catch what the staged-file path misses (closes the "green local / red CI" false-negative window).
- **`--no-verify` caveat:** `git commit --no-verify` and `git push --no-verify` bypass Lefthook silently. The CI-side gates (gitleaks, Semgrep, lint, test, drift-check) are authoritative; AGENTS.md instructs agents to never pass `--no-verify`.

### L9 — Hygiene, dependency health & security (cost-proof, two-phase)

| Area                       | Decision                                                                                                                                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dead code / drift**      | **Knip** (config now, advisory until apps land, then error) + **Syncpack** + **pnpm catalog** (centralized version pinning) + flip dependency-cruiser **`no-orphans` → error**                                                                                                            |
| **Dependency vulns (SCA)** | **osv-scanner** (CI gate, fails build on known CVE, free) + **Dependabot alerts** (free, incl. private) + `pnpm audit`                                                                                                                                                                    |
| **Dependency updates**     | **Renovate** (grouped `packageRules` = low PR noise, automerge patches, pnpm-catalog-aware)                                                                                                                                                                                               |
| **Secrets**                | **gitleaks** (always-on: Lefthook pre-commit + CI, free, private-proof) **+ GitHub native secret scanning + push protection** (free while public; **AWS partner program auto-revokes leaked keys**; auto-off on private since it needs GHAS — gitleaks carries the gap, no surprise bill) |
| **Code SAST**              | **Semgrep** (always-on: fast, Lefthook + PR, free on private) **+ CodeQL** (deep, out-of-band: weekly `schedule` + push-to-main, **public-only via a `repository.visibility` workflow guard** → auto-disables on private, no GHAS bill)                                                   |

**Security principle:** for each of SAST and secrets, run a **portable free OSS tool always-on** (gitleaks / Semgrep — work on private, run locally so agents self-correct) **+ the best-in-class free GitHub-native tool while public** (native secret scanning + CodeQL — auto-disable on the private transition). **GitHub Advanced Security is never required**; coverage stays free in both the public and private phases.

**L9 — Hardening detail (round-2 review):**

- **Renovate automerge constraint:** set `minimumReleaseAge: '3 days'` (community detection window for novel malicious patch-version pushes) and restrict automerge to `lockFileMaintenance` PRs only. All dependency version bumps (including patches) require human review. Rationale: osv-scanner catches known CVEs but NOT novel malicious code published by a compromised maintainer; Semgrep scans project code, not new transitive code introduced by the patch — automerge here is the exposed surface.
- **Sentry SaaS data boundary:** source maps upload to Sentry only — NEVER deploy them to the public CDN (would allow client-side source reconstruction). Enable Sentry project setting "Hide source content" so original source is masked in error frames. `SENTRY_AUTH_TOKEN` uses `project:releases` write scope only, stored as a GitHub Actions **environment** secret on a dedicated `production-build` environment (NOT a repo-level secret). **Critical mechanism:** the source-map-upload CI job MUST declare `environment: production-build` in its workflow YAML — without that declaration, environment secrets are injected unconditionally and behave as repo-level secrets (accessible to fork PRs). Also restrict the `production-build` environment's deployment-branch rule to `refs/heads/master` only; the upload job only runs on `push:master` events, never `pull_request`.
- **CodeQL `repository.visibility` guard implementation:** job-level `gh api repos/${{ github.repository }} --jq .visibility` check exporting the result as a job output; gate both the CodeQL job AND its SARIF-upload step with `if: needs.visibility-check.outputs.visibility == 'public'`. This covers `schedule` events that don't always populate `github.event.repository.visibility` the same way as `push`/`pull_request` events.

| Layer                                                                                                                                       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Why                                                                                                                                                                                                                                                                                    | Rejected                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L10a Linear MCP (foundation)** — ⛔ SUPERSEDED → Jira (see `docs/decisions/2026-06-11-tracker-linear-to-jira.md`)                         | One-time MCP token setup with explicit hygiene: minimum scope `write:issues` only (NOT admin), stored in OS keychain (NOT a dotfile, NOT a repo env var), 90-day rotation, machine-compromise response = `revoke at linear.app/settings/api`. Existing Linear project (`notation-hero-db465058e201`) already active. **Uptime SPOF fallback (v2):** agents append bullets to `tooling/linear-pending.md` (committed markdown TODO) when MCP unavailable; next agent session drains the file by flipping `- [ ]` to `- [x]` per successful Linear call — so a Linear outage or expired token does not silently lose deferred-item bookkeeping. (Original v1 used a typed JSON queue + state-machine drain; re-decided after implementation surfaced over-engineering — see "Implementation re-decisions" below.) | Genuinely agent-native — MCP IS the agent's hands into Linear; immediate value before any PR exists; lets agents mirror the L13 "Deferred" list as Linear tickets during foundation buildout itself. Fallback closes the SPOF gap at the minimum shape that handles real failure modes | Custom Linear API integration (overkill for solo); storing token in repo env var (rejected — exfiltration risk); typed JSON queue with state-machine drain (rejected v2 — over-engineered for ~99.9% SLA solo-dev failure surface) |
| **L10b Linear GitHub App (deferred — first PR trigger)** — ⛔ SUPERSEDED → Jira (see `docs/decisions/2026-06-11-tracker-linear-to-jira.md`) | Native Linear GitHub App (branch→issue, status automation on merge) — wires at first PR loop (build-phase). Tracked in "Deferred" section + DangerJS first-PR trigger.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Repo↔Linear bridge needs GH repo linked to Linear team + branch-naming convention (`LEO-<n>-<slug>`); no value before there's a PR for it to act on                                                                                                                                    | Custom GH-Actions↔Linear sync (overkill for solo)                                                                                                                                                                                  |

### Additional upfront setup (gap sweep — L11–L13)

Beyond the 10 dev-tooling layers, these were confirmed in-scope from `stack-aws-brainstorm.md` + the Approver's completeness pass. They extend the infra/enforcement set (allowed to grow); they do not alter the frozen foundation.

| Layer                                                     | Decision                                                                                                                                                                                                             | Why                                                                                                                                                                                                                                                                                                                                                                     | Notes                                                                                                                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **L11 Observability**                                     | **Sentry** for **client** JS errors now (source maps + release tagging from commit #1). **CloudWatch + X-Ray** for backend SRE/SLOs land **with the Lambdas** (build-phase, not pre-setup).                          | Source-map/release wiring is painful to retrofit; `stack-aws-brainstorm.md` already chose Sentry (client) / CloudWatch+X-Ray (backend) / SQS→S3→Athena (usage). Free tiers.                                                                                                                                                                                             | CloudWatch RUM rejected (not free). Sentry-for-Lambda deferred (backend stays on CloudWatch/X-Ray).                                                                               |
| **L12 Cross-cutting upfront**                             | **Typed env validation** (zod schema, e.g. `t3-env`) + **Node/pnpm version pinning** (`.nvmrc` + `packageManager`) + **`eslint-plugin-jsx-a11y`** + **perf/bundle budget** (`size-limit`, optionally Lighthouse CI). | Each is cheap now / painful or drift-prone later. a11y folds into L3's growable ESLint engine. Dev spans Mac + iPad → pinning matters.                                                                                                                                                                                                                                  | size-limit gate runs in CI; budgets ratchet like coverage.                                                                                                                        |
| **L13 Test/dev harnesses (deferred — first-use trigger)** | **Deferred** to first-use trigger — only conventions established now (test-ID naming, default story glob `\*_/_.stories.@(ts                                                                                         | tsx)`, docker-compose port allocations). Harnesses stand up at trigger: **Storybook** (first `\*.tsx`component), **Playwright** (first E2E test), **LocalStack** (first AWS-adapter integration test). Tracked in`## Deferred — awaiting first-use trigger`; DangerJS first-use rule (see L6 implementation detail) comments on the PR introducing each first instance. | Same logic as Stryker setup-when-first-test-exists. Avoids standing up empty harnesses that rot silently; active reminders via DangerJS catch the moment without manual tracking. | Real AWS stays primary for learning; LocalStack for fast local/CI only. |

Build-phase (NOT pre-setup — lands with the AWS work per the learning order): CloudWatch + X-Ray, Cognito, SQS/SNS/DynamoDB/Streams, S3/CloudFront, Athena, Kafka-local, **Linear GitHub App (L10b)** at first PR. **Pulumi** (IaC) is already decided.

### Conventions — domain-driven, co-located

- **Domain/feature-organized folders, one folder per unit.** Group by domain, not by file-type (no top-level `__tests__/` or `stories/` trees).
- **Tests and stories co-located with source:**

  ```
  Player/
    Player.tsx
    Player.test.tsx      # Vitest, next to source
    Player.stories.tsx   # Storybook (default plural glob — agent-idiomatic)
    index.ts             # optional barrel
  ```

- **Config implications (set these so the gates don't false-positive):**
  - Vitest test glob `**/*.test.{ts,tsx}`; **exclude `*.test.*` and `*.stories.*` from coverage targets** (don't measure coverage _of_ tests/stories).
  - **dependency-cruiser `no-orphans` (now `error`) and Knip must treat `*.test.*` / `*.stories.*` as entry points / exclusions** — otherwise co-located tests/stories read as orphans. This is the exact false-positive that got `no-orphans` dropped before; configure it correctly this time.
  - Storybook `stories` glob = the **default** `**/*.stories.@(ts|tsx)` (plural — the standard agents emit by default, so no corrections needed).
  - **One structure, encoded for everyone:** AGENTS.md documents the convention (agents scaffold it correctly), Nx generators emit it (scaffolding matches), and the gate configs above know it (no false-positives) — humans, agents, and tools share one shape.

### Serverless project layout — handler vs IaC (the colocation gotcha)

**Verified (Nx docs + Pulumi, 2026):** `@nx/enforce-module-boundaries` is **project-level only** — tags live on `project.json`, and the rule is _blind to imports between two files in the same project_. So a Lambda `handler.ts` and its Pulumi `infra.ts` **must not share one Nx project**, or:

- the boundary rule can't stop `handler → @pulumi/*` or `infra → @core/*` (same project = no boundary between them);
- under the `FileArchive` bundle pattern, deploy-time `@pulumi/*` can **silently ship inside the Lambda bundle** (Pulumi only auto-strips `@pulumi/*` in the inline `CallbackFunction` path, which we don't use).

**Rule — separate Nx projects, always:**

| Role              | Project                       | Tag          | Imports                 | Never         |
| ----------------- | ----------------------------- | ------------ | ----------------------- | ------------- |
| Handler (runtime) | `apps/<fn>`                   | `type:app`   | `@aws-sdk/*`, `@core/*` | `@pulumi/*`   |
| IaC (deploy-time) | `infra/<fn>` (or one `infra`) | `type:infra` | `@pulumi/*`             | domain source |

- Infra references the handler's **build output**, never its source — so `@pulumi` never enters the Lambda bundle:

  ```ts
  code: new pulumi.asset.FileArchive(path.resolve(__dirname, '../../apps/<fn>/dist'));
  ```

- **Handler build-output convention:** each `apps/<fn>` Nx project sets `targets.build.options.outputPath = "dist"` (project-relative). `apps/<fn>/` and `infra/<fn>/` must be siblings under the same parent so the `../../apps/<fn>/dist` resolution works. AGENTS.md documents this convention so generators emit the right `outputPath`.
- Wire the Nx graph (the dist-path link is invisible to Nx's static analysis):

  ```jsonc
  // infra/<fn>/project.json
  "implicitDependencies": ["<fn>"],
  "targets": { "deploy": { "dependsOn": [{ "projects": ["<fn>"], "target": "build" }] } }
  ```

- **dependency-cruiser** covers the file/package-level bans Nx can't see (this is why the DACI keeps both):

  ```js
  { from: { path: "^apps/[^/]+/src" }, to: { path: "@pulumi/" },          severity: "error" } // handler ↛ pulumi
  { from: { path: "^infra/" },         to: { path: "^(apps|libs)/" },     severity: "error" } // infra ↛ source
  { from: { path: "^libs/core/" },     to: { path: "@aws-sdk/" },          severity: "error" } // core ↛ aws-sdk
  { from: { path: "^libs/adapters/" }, to: { path: "^(apps|infra)/" },    severity: "error" } // adapters ↛ domain/infra (adapters are horizontal)
  // Adapters MAY import `@aws-sdk/*` and `@core/*` (interfaces) — no rule needed (those are the legitimate paths)
  ```

Colocation (`CallbackFunction` inline, CDK `NodejsFunction` next to source, SST) is valid for single-function / full-IaC-framework projects, but trades away Nx boundary enforcement + per-function `nx affected` — not compatible with the hexagonal layer model here.

## Sequencing (build order — foundation first, while it's free)

1. **Foundation (do first, while layers are empty):** pnpm migration (delete committed `bun.lock`, remove `packageManager: bun@*`, add `packageManager: pnpm@*`, generate `pnpm-lock.yaml`, swap CI `setup-bun` → `pnpm/action-setup`, replace any `bun run --filter='*'` script references with `nx`-driven equivalents) → `nx init` → real Nx libs/apps with `type:` tags → TS project references + `composite` + `isolatedDeclarations` → ESLint flat + Prettier → dependency-cruiser kept for cycles.
2. **Local gate + shared configs:** Lefthook running `nx affected` gates (pre-commit + pre-push) → shared config packages.
3. **CI architecture + agent surface:** reusable workflow with `nrwl/nx-set-shas` for base/head SHA wiring → `nx affected` pipeline → fix `master`/`main` trigger → retention-7d → **merge-queue IF GitHub plan tier supports `merge_group` (per L7 detail; otherwise branch-protection + linear history + required reviews until plan upgrade)** → Dangerfile + commitlint + CODEOWNERS → AGENTS.md generator + drift-check (drift-check is a CI job; needs the CI environment to run in).
4. **Test integrity:** Vitest + coverage ratchet → vacuous-green fix + no-empty-scripts guard → Stryker config (core).
5. **Dep health + security:** Knip + Syncpack + pnpm catalog + `no-orphans`→error → osv-scanner + Dependabot alerts → gitleaks + native secret scanning → Renovate → Semgrep + CodeQL (guarded).
6. **Integrations (deferred until first PR):** **Linear GitHub App (L10b)** wires at first PR per "Deferred — awaiting first-use trigger". **Linear MCP (L10a)** is foundation and should land earlier than this step — see checklist item near top.
7. **Test/dev harnesses (L13):** LocalStack docker-compose + adapter-integration-test pattern → Playwright E2E scaffold + test-ID convention → Storybook (default `*.stories.tsx` glob).
8. **Cross-cutting + observability (L11–L12):** typed env schema (zod) → `.nvmrc` + `packageManager` pin → `eslint-plugin-jsx-a11y` (into the L3 ESLint config) → `size-limit` budget gate → Sentry client SDK (source maps + release tagging in CI).
9. **Self-testing probe suite:** add once the boundary rules exist (one fixture per rule; grows with the rule set).

## Open verification / first-PR checklist

**Phasing note (round-2 review):** this checklist is the **full foundation surface**, NOT a single-PR requirement. Each item is tagged with its target **Sequencing step number** (e.g., `[Step 1]` = Sequencing step 1 "Foundation"). Group items into 5-7 baby-PR batches — each batch ≤ ~400 LOC (per DangerJS PR-size rule) and one cohesive theme. The 1-week Time-to-first-deploy target is for the full checklist to land across ~7 baby PRs, not for PR #1 to clear everything. If a single item blocks the current PR, defer it to a later batch in the same step.

Items below are reordered by Sequencing step ascending; check off as each lands.

- [x] **`[Done]` Default branch = `master`** (confirmed: `ci.yml` triggers `master`, no remote, `git branch --show-current` = `master`). All `on.push.branches` / `merge_group` / OIDC trust-policy refs use `refs/heads/master`.
- [x] **`[Step 0]` Set up Linear MCP token** with hygiene per L10a: minimum scope `write:issues`, stored in OS keychain (not dotfile/env var), 90-day rotation calendar reminder, document `revoke at linear.app/settings/api` in machine-compromise runbook. Mirror the "Deferred" list as Linear tickets once MCP is wired. **Shipped in [PR #2](https://github.com/leocaseiro/notation-hero/pull/2):** runbook at `docs/runbooks/linear-mcp.md` + Deferred items mirrored as NH-29/30/33/34 (orig. Linear LEO-98/99/100/101).
- [x] **`[Step 0]` Initialize `tooling/linear-pending.md`** (markdown TODO) as the MCP-downtime fallback; document the agent-session drain procedure inline in the file. CI drain job is optional + lands later; the markdown form is human-runnable already. **Shipped in PR #2 (DACI L10a v2 — see Implementation re-decisions; replaces the v1 JSON queue).**
- [x] **`[Step 1]` Run the pnpm migration as the first commit** (cheapest while skeleton). **Shipped in PR #2 commit `1499903` — `packageManager: pnpm@11.5.2`, `pnpm-workspace.yaml`, CI `pnpm/action-setup@v4 + setup-node@v4` (Node 22, cache: 'pnpm').**
- [x] **`[Step 1]` nx foundation: `nx init` + `targetDefaults` + tag convention + `@notation-hero/infra` (`type:infra`)** — the nx wiring (task pipelines, root `nx run-many` scripts, `@nx/js`/`@nx/eslint` generators, and the `core/*`→`type:core` … tag map) shipped on `chore/nx-init`. Example domain packages were deliberately **not** invented; the first real `core`/`adapter`/`app` packages materialize with their domains (catalog first) per `per-feature-spec-precision`.
- [x] **`[Step 1]` F-8 — replace `pnpm -r --if-present run X` + direct-eslint `lint` with `nx run-many --target=X`** (nx-driven equivalents; retires the PR #4 interim bridge, the Task 8 commit `be36f89`). `depcheck` stays the root depcruise call. Shipped on `chore/nx-init`.
- [ ] **`[Step 1]` Set type-coverage / coverage / mutation start floors** low; ratchet up as real code lands. **Infra projects (`type:infra`) use lower type-coverage floors** (~90%) due to Pulumi `Output<unknown>` complexity (per M-2); other projects start ~95% and ratchet up together.
- [ ] **`[Step 1]` Scaffold each Lambda as SEPARATE `apps/<fn>` (`type:app`) + `infra/<fn>` (`type:infra`)**; never colocate `handler.ts` + `infra.ts`. Infra references `apps/<fn>/dist` via `FileArchive`; wire `implicitDependencies` + `deploy.dependsOn`.
- [ ] **`[Step 1]` Add dependency-cruiser file-level rules:** handler ↛ `@pulumi/*`, infra ↛ `apps`/`libs` source, core ↛ `@aws-sdk/*`, **adapters ↛ `apps`/`infra` source** (adapters are horizontal — they MAY import `@aws-sdk/*` and `@core/*` but never domain or infra). Document the serverless split in AGENTS.md so agents scaffold it.
- [ ] **`[Step 1]` Wire `build:dts` Nx target** running `tsc -b --emitDeclarationOnly` per library package; cache `dist/types/` as an Nx output (per L4 declaration emit pipeline).
- [ ] **`[Step 3]` Verify GitHub plan tier supports `merge_group`** before wiring Sequencing step 3 (Free for public repos; Team+ for private; downgrade L7 to branch-protection + linear history + required reviews if Free private).
- [ ] **`[Step 3]` Wire `nrwl/nx-set-shas@v4`** (or explicit `NX_BASE`/`NX_HEAD`) into the reusable workflow so `nx affected` gets correct base SHAs on `pull_request`, `push:master`, AND `merge_group` events (per L7 implementation detail).
- [ ] **`[Step 3]` Monitor Nx Cloud free-tier compute-credit usage** in the first 30 days; plan local-cache fallback or self-hosted S3 cache if cap proves insufficient (per L7 implementation detail).
- [ ] **`[Step 3]` Add CODEOWNERS coverage for enforcement-rule files:** `tooling/dangerfile.ts` + rule modules, `tooling/probes/**`, `.github/workflows/{drift-check,update-floors}.yml`, `.github/CODEOWNERS`, `eslint.config.*`, `dependency-cruiser.cjs`. Document the direct-master-push exception in AGENTS.md for when these need to change (self-approval block applies).
- [ ] **`[Step 3]` Add DangerJS enforcement-file meta-rule:** any PR modifying a CODEOWNERS-protected enforcement file must be enforcement-only (no source/test files in the same diff). Document in AGENTS.md.
- [ ] **`[Step 3]` Wire DangerJS first-use trigger rules:** first `*.tsx` component → Storybook prompt; first `*.e2e.*` / `e2e/**` → Playwright prompt; first `adapters/aws-*/**/*.integration.test.ts` → LocalStack prompt; first PR → Linear GitHub App prompt (per L6 implementation detail). Warnings, not failures. **Per L6 hardening:** glob exclusions for tests/stories/configs, persisted flag file `tooling/first-use-flags.json` for concurrency safety, `gh api` check for "no merged PRs exist" replacing fragile `pr.number === 1`.
- [ ] **`[Step 3]` Configure AGENTS.md generator drift-check** to fail if AGENTS.md is regenerated without the source config also changing in the same PR (per L8 implementation detail).
- [ ] **`[Step 4]` Constrain `update-floors` job** to `workflow_dispatch` OR `push: branches: [master]` triggers only — never `pull_request*` — and gate via an Actions environment with a required reviewer (per F-3 hardening). `tooling/floors.json` itself is intentionally NOT CODEOWNERS-protected (solo-dev self-approval block; defense is workflow_dispatch + environment-reviewer + DangerJS rule).
- [ ] **`[Step 4]` Add DangerJS rule** failing any PR that modifies both `tooling/floors.json` AND test files in the same PR (closes the floor-downgrade attack; per F-3 hardening).
- [ ] **`[Step 4]` Add the "no escape hatches" ESLint rule set** (`@eslint-community/eslint-plugin-eslint-comments` + `@typescript-eslint/ban-ts-comment` + `/* istanbul ignore */` ban) so agents cannot disable their way past a gate (per F-3).
- [ ] **`[Step 4]` Configure Stryker for `core/` layer** once first behavior-bearing test exists; reserve the mutation floor slot in `tooling/floors.json` with `null` until then (per L5 implementation detail).
- [ ] **`[Step 4]` Decide Stryker scope expansion** (core → adapters) once adapters have logic.
- [ ] **`[Step 4]` Keep Storybook on default `*.stories.tsx` glob; align Vitest coverage excludes** for `*.test.*` / `*.stories.*`.
- [ ] **`[Step 4]` Initialize `tooling/isolated-declarations-log.json`** with the 3-bucket classification schema; log every `isolatedDeclarations` CI failure with PR ref + file + bucket + agent attribution (per F-1 measurement addendum). Review at PR #5 or first-ports landing — whichever comes first.
- [ ] **`[Step 4]` Wire DangerJS bucket-classification prompt** on `isolatedDeclarations` CI failures: comment with the 3 buckets + ask "which bucket?" so log entries happen at PR time, not retroactively (per F-1 addendum / L6 wiring + anti-self-grading hardening: bucket (3) requires line-ref citation; Approver co-sign + 30% blind spot-audit at PR #5).
- [ ] **`[Step 5]` Enable GitHub native secret scanning + push protection** in repo settings now (public).
- [ ] **`[Step 5]` Implement CodeQL `repository.visibility` guard** (or `gh api` guard job) so it auto-skips on private.
- [ ] **`[Step 5]` Configure `no-orphans` + Knip to exclude / treat-as-entry `*.test.*` and `*.stories.*`** (avoid the prior false-positive); document the folder convention in AGENTS.md so agents follow it.
- [ ] **`[Step 5]` Configure Renovate:** set `minimumReleaseAge: '3 days'`; restrict automerge to `lockFileMaintenance` PRs only; all dependency version bumps (including patches) require human review (per L9 hardening).
- [ ] **`[Step 8]` Create Sentry project + generate project-scoped auth token**; add `SENTRY_AUTH_TOKEN` to GitHub Actions secrets (required before CI source-map upload; omission causes silent-fail — see F-7). **Mechanism:** CI build job MUST declare `environment: production-build` in workflow YAML; deployment-branch rule restricts to `refs/heads/master` only.
- [ ] **`[Step 8]` Wire Sentry source maps + release tagging** into the CI build (client).
- [ ] **`[Step 8]` Add typed env schema** (zod/t3-env), `.nvmrc` + `packageManager` pin, `eslint-plugin-jsx-a11y`, and a `size-limit` budget.
- [ ] **`[Step 6 / Deferred]` Link GH repo to Linear team via Linear GitHub App** + adopt branch-naming convention `LEO-<n>-<slug>` at first PR (per L10b deferred).

## Supersedes

Reverses ideation rejection **R1** (Nx/Turborepo deferral) under the complete-now principle. All other ideation rejections (Moon, Oxlint-as-primary, append-only test ledger, hermetic CI, per-layer CI matrix) stand. CodeQL is **added** (not rejected) as the public-phase deep-SAST tier alongside Semgrep.

## Review resolutions (external review — 2026-06-09)

External review (CMS-plan owner) raised 7 material + 10 minor + 1 cosmetic finding; all accepted except where noted.

**Material:**

- **F-1 (isolatedDeclarations cost):** L4 — `isolatedDeclarations` needs explicit return-type annotations on every public export (~5-10% extra LOC on public APIs; agents emit them by default). Benefit (3-15× incremental `.d.ts`) holds; cost is priced in. **See F-1 measurement addendum below (round-2 review).**

- **F-1 measurement + classification addendum (round-2 review):** `isolatedDeclarations` is **not** a one-way door — it's a tsconfig flag, flipping OFF later is one config line (annotations stay in place but become redundant-with-inference). The real cost vector is **agent-compliance friction**: cycles burned by agents forgetting return-type annotations. Measure that signal directly rather than counting raw CI failures.
  - **Measurement window:** keep enabled through (a) the first **5 agent-authored PRs**, OR (b) until `libs/core/<bcontext>/ports/` for the first bounded context lands — whichever comes first. The port surface is where the explicit-public-contract benefit first materializes; failures before any `core/` code exists aren't representative.
  - **Per-failure classification (committed `tooling/isolated-declarations-log.json`):** every CI failure on `isolatedDeclarations` is logged with one of three buckets:
    1. **AGENTS.md compliance gap** — rule IS in AGENTS.md; the agent didn't apply it. Fix the agent's prompt or AGENTS.md framing.
    2. **Documentation gap** — rule is NOT in AGENTS.md, or is buried/unclear. Add it explicitly.
    3. **Rule did its job** — the missing annotation surfaced a real type-clarity issue (accidental `any` leak, ambiguous public contract). Keep; this cycle was value-add, not cost.
  - **Decision threshold (evaluated at end of measurement window):**
    - If buckets (1) + (2) > 50% → **AGENTS.md isn't communicating.** Fix AGENTS.md before relaxing the rule. The L8 drift-check should have caught this; if it didn't, the drift-check is also broken — fix that first.
    - If bucket (3) ≥ 50% → **rule is doing its job.** Keep enforcing globally; no fallback.
    - If (1)+(2) < 50% AND (3) < 50% AND total failures > 2 per PR average → cost is real AND value-add isn't dominant. **Apply the F-1 fallback** — relax to opt-in on `libs/core/*` AND `libs/adapters/*` AND shared types only; opt-out for `apps/*` runtime and `infra/*` Pulumi resources where `Output<unknown>` makes annotation friction high. **Adapters are included because the port-contract benefit (a) is two-sided** — ports defined in `core/` are _implemented_ in `adapters/`; if adapters lose enforcement, an adapter can leak `any` while the port interface still asserts a strict contract, undermining the cited round-2 reframing rationale.
  - **Benefit accounting (round-2 reframing, with corrected timing):**
    - **(a) Explicit public-API contracts at ports** — portfolio + interview signal in a hexagonal architecture. _Timing: materializes when the first `libs/core/<bcontext>/ports/` file is created._ The contract-visibility benefit needs a contract to be visible. If this benefit hasn't materialized by ports-landing, the bounded-context structure is the problem, not `isolatedDeclarations`.
    - **(b) Refactor safety against internal type leaks** — internal types leaking into public surfaces fail compile. _Timing: lands at PR #1 on any TS file with exports._
    - **(c) `any`-leak detection paired with type-coverage ratchet** — `any` cannot hide behind inference at the public boundary. _Timing: lands at PR #1._
      Benefits (b) and (c) justify the rule from day 1; benefit (a) is the portfolio/interview signal that materializes with the bounded-context milestone — both timing axes are real and complementary.
  - **Falsification signal (mirrored into "When this principle applies"):** if AGENTS.md compliance rate on the explicit-return-type rule stays > 80% on first try across the 5-PR window, the rule is paying for itself — no relaxation needed regardless of total failure count.
  - **L6 wiring:** a DangerJS rule prompts the bucket classification on each `isolatedDeclarations` CI failure (comment with the 3 buckets + a one-line ask "which bucket?") so the log entry happens at PR time, not retroactively.
  - **Anti-self-grading hardening (round-2 review):** agents would otherwise grade their own homework — systematic over-classification into bucket (3) (looks good, no remediation) or bucket (2) (escapes the rule). Three safeguards:
    1. **Bucket (3) requires line-ref citation.** Classifying a failure as "rule did its job" requires citing the specific PR-line where the missing annotation surfaced a non-trivial inferred type (e.g., accidental `any` leak at line N, or ambiguous-public-contract at line M). DangerJS rejects bucket (3) classifications without a non-trivial line-ref.
    2. **Approver co-signs bucket (3) at end of measurement window.** At PR #5 (or first-ports landing), the Approver reviews all bucket (3) entries and explicitly co-signs or downgrades each. Agents propose; human ratifies.
    3. **Blind spot-audit invariant.** At PR #5, Approver re-classifies a random 30% sample of all entries BLIND (without seeing the agent's bucket). If bucket disagreement exceeds 1/3 of the sample, the entire log falls back to "(1)+(2) > 50%" — AGENTS.md gets prioritized revision regardless of the raw bucket counts. This is the agents-can't-be-trusted-to-self-grade fallback.
- **F-2 (Stryker on ports):** L5 — Stryker `mutate` glob **excludes interface/port files** (no behavior to mutate); target behavior-bearing files (entities, value objects, validators). Tests stay **co-located** (NO `__tests__/` convention); port fakes co-locate (`*.fake.ts`) or live in a small `test-utils` package. `*.test.*` / `*.stories.*` / fakes never ship (build + bundle excludes).
- **F-3 (ratchet persistence + no-escape-hatches):** L5 — floors live in a committed `tooling/floors.json` (one floor per metric × per Nx project). PRs fail if coverage/mutation/type-cov drops below the committed floor (read-only); an `update-floors` job (`contents: write`, `push:master` only) bumps floors up + commits. Start low (~60% coverage / 50% mutation / 90% type-cov), ratchet up. **Plus a "no escape hatches" ESLint rule set:** ban/limit `eslint-disable` (`@eslint-community/eslint-plugin-eslint-comments`, require reason), `@ts-ignore`/`@ts-nocheck` (`@typescript-eslint/ban-ts-comment`), and `/* istanbul ignore */` — stops agents disabling their way past a gate (anti-gaming layer for the gates themselves; grows with the rule set). **Hardening (round-2 review — three personas converged on a P0 attack vector):** (1) `update-floors` is constrained to `workflow_dispatch` OR `push: branches: [master]` triggers only — NEVER `pull_request*` — and gated by a GitHub Actions environment with a required reviewer; (2) ~~CODEOWNERS protects `tooling/floors.json`~~ — **dropped for solo-dev context** (CODEOWNERS would block self-approval since leocaseiro is the only owner). Protection relies on (1) workflow_dispatch + environment-reviewer + (3) the DangerJS rule below + (4) attack-vector documentation; (3) a **DangerJS rule fails any PR that modifies both `tooling/floors.json` AND test files in the same PR** (closes the "delete tests + lower floor together" attack — the read-only PR check otherwise passes when the metric stays at/above the new lower floor); (4) the floor-downgrade-via-PR-injection attack vector is documented here so future reviewers see it.

**Enforcement-file CODEOWNERS protection (round-2 — rule-deletion attack defense):** While `tooling/floors.json` is unprotected by CODEOWNERS (self-approval block on solo), the _enforcement-rule files themselves_ — the rules that detect attacks — ARE CODEOWNERS-protected to prevent a same-PR rule-deletion attack (PR deletes a DangerJS rule AND exploits the gap it would have caught, in one diff). Protected paths: `tooling/dangerfile.ts` + any imported rule modules, `tooling/probes/**`, `.github/workflows/drift-check.yml`, `.github/workflows/update-floors.yml`, `.github/CODEOWNERS` itself (recursive), `eslint.config.*` (the "no escape hatches" rule set), `dependency-cruiser.cjs`. Plus a **DangerJS meta-rule:** any PR modifying a CODEOWNERS-protected enforcement file MUST be enforcement-only (cannot also touch source or test files in the same diff) — forces rule changes into isolated PRs. AGENTS.md documents: "enforcement-rule files are isolated-PR-only; never mix with feature code." **Solo-dev caveat:** these enforcement files still hit the same self-approval block on PRs; when an enforcement-file change actually needs to merge, use either the documented direct-master-push exception OR an added 2nd-reviewer account (deferred decision; defaults to direct-push until a second account is set up).

- **F-4 (Nx-managed project references):** L4 — TS `references` are **Nx-managed via `nx sync`** (CI runs `nx sync --check`; free, Nx core, no Nx Cloud). Do **not** hand-edit `references` arrays — this removes the tsconfig merge-conflict problem. Enable via `nx.json` `sync-generators`; AGENTS.md documents "never hand-edit references."
- **F-5 (default branch):** ✅ confirmed `master` (see checklist).
- **F-6 (Bun):** ✅ Bun **fully dropped** — pnpm only.
- **F-7 (Sentry token):** checklist — create Sentry project + project-scoped auth token; add `SENTRY_AUTH_TOKEN` GitHub Actions secret **before** wiring source-map upload (silent-fails without it).

**Minor (accepted):** M-1 DangerJS test-relocation opt-out label (`refactor:test-relocation`); M-2 per-Nx-project type-coverage floors (infra lower due to Pulumi `Output<unknown>`); M-3 `merge_group` requires branch-protection (post-repo-creation step); M-4 add `eslint-config-prettier`; M-5 `.nvmrc` Node version = Lambda runtime (esbuild target match); M-6 per-Lambda `size-limit` budget on `dist` (catches Pulumi leaking into the bundle); M-8 add `.pulumi/` + Pulumi stack files to `.nxignore` + `.gitignore`; M-9 Linear MCP token one-time setup.

**M-7 (changelog/release):** ✅ **`nx release`** (commit-driven, Nx-native) — reads conventional commits → per-`@notation-hero/*`-package SemVer bump + per-project `CHANGELOG.md` + git tags. Alpha track via `nx release --prerelease alpha` (`1.0.0-alpha.x` on master merge); PR previews via explicit specifier (`0.0.1-pr.{prId}`) in a PR job. Per-version `changelog/changelog-{ver}.md` files = small custom post-`version` step (default is cumulative per-package `CHANGELOG.md`). Chosen over changesets (manual intent files, not commit-driven) and release-please/semantic-release (standalone) because it reuses commitlint + Nx with no extra tool. Main app package = `@notation-hero/player-pwa`.

**M-10 (license/header):** ⏳ **TBD** — license (proprietary vs open-source) + the `eslint-plugin-header` copyright rule are pending the open-source decision. Tracked in Linear (ticket created 2026-06-09, team Leocaseiro).

**Cosmetic:** L9 label added to the dependency-health/security section.

## Implementation re-decisions (post-implementation amendments)

### L10a v2 — Replace JSON queue with markdown TODO (2026-06-09)

**Original (v1):** `tooling/linear-queue.json` + `linear-queue.schema.json` + state-machine drain procedure (ULID `id` format, `linearId` write-back for idempotency, `action` enum mapping to MCP tools, `attempts`/`lastError` tracking).

**Re-decision (v2):** `tooling/linear-pending.md` — a markdown TODO file. Bullets per pending Linear operation; drained via "for each `- [ ]` bullet, attempt the MCP call, flip to `- [x]` on success with inline `LEO-XXX` note for idempotency".

**Why:** Implementing v1 in [PR #2](https://github.com/leocaseiro/notation-hero/pull/2), then walking the resulting `/ce-code-review` findings, exposed that the typed queue was over-engineered for the actual failure mode (Linear MCP outage in solo-dev with Linear's ~99.9% SLA). The hardening commits — F-1 idempotency via `linearId`, F-2 ULID id format, F-5 action→tool mapping table — were a leading indicator that the design was reaching beyond its real scope. Approver's reframe on 2026-06-09: _"Linear is only needed for large changes — small ops go to markdown."_

**What survived v1 → v2:**

- Token hygiene rules (`write:issues` scope, OS keychain, 90-day rotation) — unchanged
- Machine-compromise runbook — unchanged, plus gains a token smoke-test step (F-12)
- **All hardening _concepts_** — idempotency via inline `LEO-XXX` notes in drained bullets; uniqueness via markdown's natural append + git rebase semantics; action types as table headings in the markdown
- DACI Step 0 obligation to wire MCP before PR #1 — unchanged
- Payload hygiene rules (never enqueue secrets, tokens, stack traces) — preserved as a section in `linear-pending.md`

**What v1 dropped:**

- ~200 LOC of JSON Schema + drain prose (replaced by ~80 LOC self-contained markdown)
- The CI drain workflow plan (v2 wants the same, simpler — parse markdown, not JSON)
- Code-review findings **F-7** (schema version evolution), **F-9** (CI schema validation), **F-13** (strict-additionalProperties at root) — all moot in v2 since no schema

**Where it landed:** [PR #2](https://github.com/leocaseiro/notation-hero/pull/2) commit [`bfd2827`](https://github.com/leocaseiro/notation-hero/commit/bfd2827). The schema-based queue lives in git history if v3 ever needs to reverse course.

**Doctrine note:** This is the first DACI Implementation re-decision. The "complete now, never migrate" override has its falsification signals cataloged earlier in this doc (Nx Cloud cap, first-PR cliff, slice velocity, `isolatedDeclarations` compliance). The v1 → v2 trigger here doesn't match any of those exactly — it's closer to _"first contact with implementation surfaced a latent over-engineering signal the override didn't predict."_ The lesson for future complete-now decisions: ship the minimum viable shape, then accrete complexity only on first real pain. The hardening cycle that surfaced this signal is itself a positive — agent-native review caught the over-engineering early enough to revise cheaply, before any agent actually used the queue.

### Wave 1 — CI Node 22 → 24 (2026-06-10)

**Original:** Wave 1 froze CI (`.github/workflows/ci.yml`) — "no `.github` changes this PR"; the existing `quality`+`build` jobs pinned `node-version: 22` (set in the PR #4 pnpm migration when 22 was the Active LTS).

**Re-decision (Approver: leocaseiro, 2026-06-10):** bump CI to `node-version: 24` in both jobs, amending the "no `.github` changes" acceptance criterion for [PR #7](https://github.com/leocaseiro/notation-hero/pull/7).

**Why:** Wave 1's `test` target runs `node --test` directly on `.ts` via default type-stripping (on by default in Node ≥22.18 and Node 24). It was validated on local Node 24 while CI still pinned 22 — a green-local/red-CI parity risk. Node 24 is the current **Active LTS** (Node 22 entered Maintenance 2025-10), so the bump makes **local == CI == Node 24** and closes the gap. The `.github` changes in PR #7 are this version bump **plus** closing a paths-filter false-green hole — adding `nx.json` to the `changes` filter (`code:` + `apps:`) so a config-only PR can no longer skip the `quality`/`build` jobs and still report green via the skip-tolerant `ci-green` gate. That is nominally a Step-3 (L7) item, pulled forward because a false green is the exact failure the whole foundation exists to prevent.

**Forward note:** `.nvmrc` = Lambda runtime (M-5) remains its own later lane; confirm `nodejs24.x` Lambda availability before the deploy lane.

## Deferred — awaiting first-use trigger

Items deferred from foundation under the "first-pain wins" pattern (see "When this principle applies"). Each is tracked here AND surfaced via a DangerJS first-use rule (L6 implementation detail) that comments on the PR introducing the first instance. Mirror to Linear tickets once L10a Linear MCP is wired.

| Layer                      | Trigger condition                                                | Setup task on trigger                                                                                                               | Linear ticket                                                                 |
| -------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| **L13 Storybook**          | First `*.tsx` component added to the repo                        | Scaffold Storybook (`npx storybook@latest init`); confirm default `\*_/_.stories.@(ts                                               | tsx)`glob; align Vitest coverage excludes for`_.stories._`                    | [NH-29](https://leocaseiro.atlassian.net/browse/NH-29) |
| **L13 Playwright**         | First `*.e2e.{ts,tsx}` or any file under `e2e/**`                | Scaffold Playwright (`npm init playwright`); commit test-ID naming convention; wire `@playwright/test` to CI                        | [NH-30](https://leocaseiro.atlassian.net/browse/NH-30)                        |
| **L13 LocalStack**         | First file under `adapters/aws-*/**/*.integration.test.ts`       | Add `docker-compose.localstack.yml`; commit adapter-integration test pattern; wire AWS endpoint override in test setup              | [NH-33](https://leocaseiro.atlassian.net/browse/NH-33)                        |
| **L10b Linear GitHub App** | First PR opened on the GH repo (`danger.github.pr.number === 1`) | Link the GH repo to the Linear team in Linear settings; adopt branch-naming convention `NH-<n>-<slug>`; verify status sync on merge | [NH-34](https://leocaseiro.atlassian.net/browse/NH-34) (PR #2 is the trigger) |

When triggered: complete the setup task, remove the row from this list, mirror status to the corresponding Linear ticket. Add new rows here whenever a future layer is deferred under "first-pain wins" — every entry also gets a corresponding DangerJS first-use rule (L6) so the trigger lands on the PR.
