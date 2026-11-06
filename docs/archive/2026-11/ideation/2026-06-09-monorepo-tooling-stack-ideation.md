---
date: 2026-06-09
topic: monorepo-tooling-stack
focus: package manager + build platform + boundary enforcement for the notation-hero hexagonal monorepo (optimize: Staff-FE interview signal, enforced clean-arch, solo low-maintenance, Node-Lambda prod)
mode: repo-grounded
---

# Ideation: Foundational monorepo tooling stack

> ## ⚠️ ARCHIVED — recovered from a branch on 2026-11-06
>
> Original path `docs/ideation/2026-06-09-monorepo-tooling-stack-ideation.md`, carried on `claude/vigorous-goldwasser-73ccca`. It never reached `master`: the branch was never opened as a pull request.
>
> **Decided nothing, and the field has moved.**
>
> It ranks tooling options for a human pick. Nx was later dropped (2026-06-17) for plain pnpm workspaces. The worktree path it mentions below no longer exists.

> Produced by `/ce-ideate` (3 divergent lenses: interview-signal, discipline÷maintenance, contrarian).
> Decides nothing — it ranks options for a human pick. **#4 and #5 conflict with the canonical
> CMS-K plan (`../charming-curran-f72274/docs/plans/2026-06-07-001-feat-cms-k-build-plan.md`), which
> assumes ~12 packages + bun — those would need a sync with that plan.**

## Grounding Context (codebase + in-session research)

notation-hero = greenfield hexagonal Layout-4 monorepo (`core/ adapters/ apps/ infra/`); only the empty U1 skeleton exists (committed: bun workspaces + dependency-cruiser + `.eslintrc.cjs` `no-restricted-imports`, both probe-validated; bun-on-Linux CI). Prod = AWS Lambda nodejs22.x + Vite SPAs on S3+CloudFront + Pulumi TS. Solo dev, full-time, AWS-portfolio + Staff-FE-interview accelerator ("rich enough to whiteboard > minimum to ship"). Canonical CMS-K plan assumes ~12 packages + bun.

Key facts (mid-2026, sourced this session): Lambda has no native bun runtime (custom runtime ~2.5× slower cold starts) → prod runs Node either way; pnpm = 2026 monorepo default, strict `node_modules` (phantom deps impossible), first-class in Nx/Turborepo; bun = fastest installs but flat `node_modules` (phantom deps possible), community-maintained/second-class in Nx. dependency-cruiser = most capable boundary tool (folder rules, cycles, orphans, alias-aware), even Nx teams use it over Nx's project-level tags. ArchUnitTS = architecture-as-tests, runner-agnostic, prose-readable. Sheriff = barrel/public-API encapsulation but 0.x + undocumented alias support. `stricter` = abandoned (2021).

## Two cross-cutting insights (the real value)

- **A. The package-manager swap (bun→pnpm) is nearly free here and is itself the clean-architecture move.** Since Lambda runs Node regardless, the ONLY thing bun buys over pnpm is install speed; pnpm's strict `node_modules` makes phantom deps _structurally impossible_ (`core/` literally can't resolve `@aws-sdk` by accident). That's filesystem-level enforcement of the exact discipline the whole project is about. pnpm is the through-line in 5 of 6 survivors.
- **B. The highest-leverage contrarian attack is package COUNT, not tooling.** ~12 `package.json` files no one publishes is the over-engineering an interviewer is most likely to ding. A folders-not-packages "modular monolith" whiteboards _identically_ (same boxes/arrows, same dependency-cruiser rules on folder paths) at a fraction of the ceremony — and conflicts with the canonical plan, so it needs a real decision.

## Ranked Ideas

### 1. Harden the Floor — pnpm + plain workspaces + dependency-cruiser + ArchUnitTS + ESLint + Vitest

**Description:** Swap bun→pnpm as installer (lights up filesystem strictness = no phantom deps), keep the validated dependency-cruiser graph gate + ESLint author-time guard, add ArchUnitTS prose-readable fitness tests on the existing Vitest. No build platform. 4 of 5 enforcement layers, one behavioral change + one dev-dep.
**Warrant:** `direct:` repo already has dependency-cruiser + `.eslintrc` validated. `external:` pnpm strict linking → phantom deps impossible; ArchUnitTS `check()` runner-agnostic + prose. `reasoned:` Lambda never runs bun, so the pnpm swap costs only install speed and buys structural discipline.
**Rationale:** Highest enforced-discipline-per-maintenance and the most directly "whiteboardable" clean-arch artifact (a passing `core has no I/O` test you can show on screen) — serves the top two priorities at once.
**Downsides:** no caching/affected (fine at solo scale; `pnpm --filter ...[ref]` gives native affected by hand); ArchUnitTS newer/less-known; loses bun install speed.
**Confidence:** 85% · **Complexity:** Low · **Status:** Unexplored

### 2. Cacheable Floor — pnpm + Turborepo + dependency-cruiser + ArchUnitTS + ESLint + Vitest

**Description:** #1 plus Turborepo as a thin task-cache over pnpm workspaces. Boundaries stay tool-owned (Turbo has no boundary opinion, so file-level granularity is retained); Turbo only memoizes lint/typecheck/depcheck/test/build. Adds a marketable Vercel-ecosystem platform skill without Nx's weight.
**Warrant:** `external:` Turbo first-class with pnpm, pure task-runner; `direct:` the committed root scripts are exactly the task set Turbo caches. `reasoned:` layering Turbo _under_ dependency-cruiser keeps surgical boundaries (vs Nx tags which coarsen them).
**Rationale:** Buys a recognizable platform credential (Turborepo) and incremental CI speed without surrendering boundary granularity or eating Nx's weight.
**Downsides:** caching ROI marginal solo (no remote team cache); "two tools for boundaries+tasks" optics (defensible); one `turbo.json`.
**Confidence:** 70% · **Complexity:** Low-Med · **Status:** Unexplored

### 3. Nx All-In — pnpm + Nx + Nx tags + dependency-cruiser (cycles only) + Vitest

**Description:** Full enterprise platform: Nx project graph, `nx affected`, caching, generators, `nx graph` (screen-shareable). Boundaries via Nx tags (project-level) + dependency-cruiser narrowly for file-level cycles. Drop bun (commit to pnpm, Nx-first-class).
**Warrant:** `reasoned:` job-hunt → "Nx monorepo" is a dense, ATS-searchable keyword most large FE orgs run; `nx graph` is a live whiteboard artifact. `external:` Nx enterprise-marketable, pnpm first-class.
**Rationale:** Maximizes raw résumé marketability + gives screen-shareable artifacts; the over-engineering risk inverts into an interview asset _if_ you can defend it.
**Downsides:** heavy for a solo 12-pkg repo ("why Nx?" pushback — answerable); Nx tags coarser than dependency-cruiser; buy-in/lock-in + learning curve; bun-friction is why bun is dropped.
**Confidence:** 60% · **Complexity:** High · **Status:** Unexplored

### 4. Modular Monolith — pnpm + ONE workspace, folders-not-packages + dependency-cruiser (folder rules) + ArchUnitTS + Vitest

**Description:** Reject the ~12-package premise. Single workspace, internal folders (`core/ adapters/ apps/`), hexagonal discipline enforced by dependency-cruiser on folder PATHS (works identically) + ArchUnitTS. Whiteboards the same; far less ceremony; graduate a folder to a package only when an external consumer appears.
**Warrant:** `reasoned:` the dependency RULE _is_ hexagonal architecture, and dependency-cruiser enforces it on folders as well as packages — `package.json` boundaries add publish/version/install ceremony that buys nothing for never-published code; 12 manifests is the textbook over-engineering ding.
**Rationale:** Directly resolves the "rich enough to whiteboard vs ceremony an interviewer dings" tension — same story, principled graduation path ("packagize when an external consumer appears").
**Downsides:** **conflicts with the canonical CMS-K plan (built around ~12 packages + bun)** → bigger plan revision + sync with the other session; loses the multi-package "monorepo tooling" resume surface (gains a "I right-sized it" story); Lambdas still need per-entry bundles (folders handle that fine).
**Confidence:** 65% · **Complexity:** Med (+ plan-coordination) · **Status:** Unexplored

### 5. Infra/App Repo Split — separate Pulumi infra repo + app monorepo (pnpm + dependency-cruiser + Vitest)

**Description:** Orthogonal structural bet: split infra (Pulumi, scary blast radius) from app (cheap changes) into two repos, communicating via stack outputs / SSM. Blast-radius isolation as a Staff system-design maturity signal. Combinable with any PM/platform choice.
**Warrant:** `reasoned:` infra and app have different change cadence, blast radius, and reviewers — a CSS tweak's CI shouldn't have authority to `pulumi destroy` a DynamoDB table; "I split infra so a FE deploy can't nuke prod" is a Staff-round maturity line.
**Rationale:** Surfaces a genuine seniority signal (deployment blast-radius thinking) the monorepo doesn't naturally tell.
**Downsides:** cross-repo version coordination (near-zero solo); **contradicts the single-repo canonical plan**; dilutes the single-"monorepo" portfolio story.
**Confidence:** 55% · **Complexity:** Med (+ plan-coordination) · **Status:** Unexplored

### 6. Don't-Touch-Bun (anti-churn) — keep bun + dependency-cruiser + ESLint + Vitest, no platform

**Description:** The discipline check on this whole exercise: bun-vs-pnpm is reversible + low-stakes; the real deliverable is the AWS portfolio. Keep bun (already wired), contain phantom-deps with a frozen lockfile + a dependency-cruiser rule, and spend the saved cycles on Lambda/DynamoDB/CloudFront work that's actually portfolio-visible.
**Warrant:** `reasoned:` motion ≠ progress; the goal is the AWS portfolio, the PM swap stays cheap for months, and bun's inner-loop install speed is a daily dividend; re-litigating tooling is the optimize-tooling-instead-of-shipping trap.
**Rationale:** Keeps the team honest about opportunity cost — the strongest argument for _not_ acting on this ideation at all.
**Downsides:** leaves filesystem strictness unenforced (phantom deps possible — counter-thematic for a clean-arch portfolio); keeps the Nx/Turbo second-class friction if a platform is ever wanted.
**Confidence:** 50% · **Complexity:** None (status quo) · **Status:** Unexplored

## Rejection Summary

| #   | Idea                                                 | Reason rejected                                                                                                                                                                               |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | bun "Baseline, Earned" (status quo, standalone)      | Duplicate — folded into #6 (Don't-Touch-Bun), which frames the status quo as a deliberate anti-churn bet                                                                                      |
| 2   | bun-conviction (bun install+test+bundle) + Turbo     | `bun:test` chokes on arch-test libs (seen this session); high-variance "conviction" story dominated by #6 (pragmatic keep-bun) and pnpm options (correctness)                                 |
| 3   | Sheriff (barrel/public-API encapsulation)            | Explicit over-enforced trap: `index.ts` barrels per module forever (solo) + 0.x with undocumented alias support on the repo's core `@core/*` ergonomic; add later if wanted, not foundational |
| 4   | eslint-plugin-boundaries as the headline             | Incremental author-time upgrade, not a foundational choice; needs resolver wiring + overlaps dependency-cruiser — fold into any survivor as an optional add-on                                |
| 5   | Primitives-flex (hand-rolled affected CI) standalone | Subsumed by #1/#4 (no platform); the real nugget (`pnpm --filter ...[origin/main]` native affected) folded into #1 as a note                                                                  |
| 6   | pnpm + Turbo + ArchUnitTS, drop dependency-cruiser   | Dropping the more-capable validated graph gate (cycles/orphans/alias-aware) for folder-pattern arch-tests with unproven alias resolution — strictly worse than #2                             |

## Notes

- Optional add-on to any survivor: upgrade the `core/`-only ESLint deny-list to systematic `eslint-plugin-boundaries` author-time enforcement (rejected as a _headline_, viable as a _bolt-on_).
- #4 and #5 both require revising the canonical CMS-K plan (other session) — coordination cost beyond this repo.
- Next step when ready: `/ce-brainstorm` on the chosen survivor, or directly revise the U1 skeleton (bun→pnpm etc.) in baby commits.
