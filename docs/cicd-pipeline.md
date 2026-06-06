# NotationHero — CI/CD + AWS Pipeline Plan

> **Purpose:** canonical, in-repo source of truth for the CI/CD pipeline, AWS
> bootstrap, and the **multi-agent parallel build** of Track 2. Lives in this
> repo (not a sibling worktree) so **Track 1 (feature) agents can see it** and
> respect the file-ownership boundaries below.
> **Status:** Wave 1 in progress · **Created:** 2026-06-06
> **Companion:** `scope.md` (requirements). Strategy/stack rationale lives in the
> `pensive-boyd-6d17e3` and `serene-grothendieck-fb5e67` worktrees (not visible here).

---

## TL;DR

- **Public** GitHub repo `leocaseiro/notation-hero` + **proprietary LICENSE**
  (public = unlimited free Actions minutes; license keeps all rights).
- **Monorepo:** `apps/web`, `infra`, later `packages/shared`. **bun 1.3.11**.
- **CI** (`ci.yml`): install → lint → typecheck → test → build. **Linux only**,
  path-filtered, concurrency-cancel, cached. iOS builds run **LOCAL**, never on
  GitHub-hosted macOS runners.
- **AWS creds:** IAM user + access keys for **local `pulumi up`**;
  **GitHub OIDC** for CI (no long-lived secrets in Actions).
- **First deliverable:** `pulumi up` deploys a **hello-world Lambda Function URL**,
  verified in CloudWatch — the smallest interview-tellable AWS story.
- **Branch protection** on `master`: require PR + green CI (single "CI Green" check).

---

## Constraints (locked)

| Constraint | Value |
|---|---|
| Package manager / runtime | **bun 1.3.11** |
| Default branch | **`master`** (not renamed to main) |
| Repo visibility | **Public** + proprietary `LICENSE` (all rights reserved) |
| Actions runners | **`ubuntu-latest` only**; iOS builds LOCAL, never GitHub-hosted macOS |
| AWS account | **Legacy (pre-2025-07-15)** → Always-Free tiers |
| IaC | **Pulumi TypeScript** (`@pulumi/aws`) |
| Web hosting | **S3 (private) + CloudFront + OAC** |
| Local AWS creds | IAM user + access keys (`aws configure`) |
| CI AWS creds | **GitHub OIDC** — zero long-lived secrets in Actions |

**Actions-minutes facts:** public repos = unlimited free Linux minutes.
macOS = 10× multiplier → iOS builds on GitHub-hosted macOS would torch any
private budget; kept local regardless to build the right habit.

---

## The multi-agent build: a 3-wave pipeline

The work is a DAG (directed acyclic graph) with hard ordering — you cannot set
branch protection requiring a CI check before the check exists and has run; you
cannot OIDC-deploy before Pulumi creates the OIDC provider; you cannot
`pulumi up` before AWS creds exist (a human step). So: **parallelize the leaves,
serialize the spine.**

```
WAVE 1 — SEED (serial, 1 agent)         the shared trunk; root-file conflicts paid ONCE
  root bun workspace + tsconfig.base + .gitignore + LICENSE
  + minimal apps/web that already lints/types/tests/builds GREEN
  + infra/ stub workspace (so the workspace array is final here)
  + ci.yml proving it green (web + infra jobs path-filtered against the stub)
        │  one PR → master
        ▼
WAVE 2 — FAN-OUT (parallel, isolated git worktrees)   disjoint subtrees, clean merges
  Lane A  infra/**         Pulumi hello-world Lambda Function URL  (owns infra/)
  Lane B  .github/**       deploy.yml + OIDC provider/role wiring  (owns deploy files)
  Lane C  root meta        README, CODEOWNERS, dependabot.yml, PR template, branch script
  Lane D  apps/web/**      landing polish (optional; hands src/** to Track 1 after)
        │  up to 4 PRs, each independently green-CI-gated
        ▼
WAVE 3 — INTEGRATION (serial, human-gated)
  1. HUMAN: create IAM user + access keys in console → aws configure   (the blocker)
  2. LOCAL: pulumi up  → hello-world Lambda Function URL → verify CloudWatch
  3. Pulumi provisions GitHub OIDC provider + deploy role → role ARN into deploy.yml
  4. merge green PRs → turn branch protection ON (checks now exist + have run)
```

**Why Wave 1 is serial:** every file is shared/foundational (root manifest,
tsconfig). Two agents editing the root manifest = guaranteed conflict. ~30 min
solo. It becomes the common ancestor every Wave-2 lane branches from.

**Why Wave 2 parallelizes cleanly:** the lanes touch **disjoint directory
subtrees**; the only shared hotspot (root manifest) is frozen by Wave 1.

---

## File-ownership map (the "agents don't collide" contract)

Every file has exactly **one owner**. This is the guarantee that parallel agents
(and Track 1 vs Track 2) never break each other. **Track 1 feature agents: read
this before editing — `apps/web/src/**` is yours; everything else here is not.**

| Path | Owner | Wave |
|---|---|---|
| root `package.json` / `bun.lock` / `tsconfig.base.json` / `.gitignore` / `LICENSE` | **Wave 1 only — FROZEN after** | 1 |
| `.github/workflows/ci.yml` | **Wave 1 only** (anticipates infra job) | 1 |
| `apps/web/**` scaffold + config | Wave 1 seeds → then **Track 1** owns `src/**` | 1 → T1 |
| `infra/**` | **Lane A** (fills the stub) | 2 |
| `.github/workflows/deploy.yml` + OIDC docs | **Lane B** | 2 |
| `README.md` / `CODEOWNERS` / `.github/dependabot.yml` / `.github/pull_request_template.md` / branch-protect script | **Lane C** | 2 |
| `apps/web/**` landing polish | **Lane D** (optional) → then Track 1 | 2 |

**Shared-file rule:** root manifest + `ci.yml` are written once in Wave 1 and
frozen. `ci.yml` is authored with the infra job already wired (path-filtered)
against the Wave-1 stub, so Lane A fills `infra/` **without editing `ci.yml`**.

**How agents stay safe:**
1. **Mechanical** — branch protection: nothing red merges to `master`.
2. **Structural** — single-owner per file (table above).
3. **Isolation** — each Wave-2 lane runs in its own git worktree.
4. **Diagnosability** — path-filtered CI points failures at the right lane.
5. **Reversibility** — small single-lane PRs → one `git revert`.
6. **Lockfile** — bun **text** `bun.lock` (default 1.2+) merges cleanly across
   parallel PRs; never the binary `bun.lockb`.

---

## CI design — `.github/workflows/ci.yml`

- **Triggers:** `pull_request` + `push: master`.
- **Runner:** `ubuntu-latest` only.
- **Concurrency:** `group: ci-${{ github.ref }}`, `cancel-in-progress: true`.
- **Setup:** `oven-sh/setup-bun@v2` pinned to `1.3.11`; cache
  `~/.bun/install/cache` keyed on `bun.lock`.
- **Install:** `bun install --frozen-lockfile` (fails on lockfile drift).
- **Path filter:** `dorny/paths-filter` emits `web` / `infra` outputs; jobs run
  only for affected subtrees.
- **Jobs:** `web` (lint → `tsc --noEmit` → `vitest run` → `vite build`),
  `infra` (typecheck/build of the Pulumi project — no-op green on the Wave-1 stub).
- **Single required check — "CI Green":** an aggregation job
  (`if: always()`, `needs: [web, infra]`) that fails if any needed job
  **failed** (skipped is OK). Set **this one job** as the required status check
  in branch protection.

### ⚠️ Footgun #1 — skipped-required-check deadlock
If you mark `web` or `infra` themselves as required checks, a PR that doesn't
touch their paths *skips* them → GitHub waits forever for a check that never
reports → PR can never merge. **Fix:** require only the always-running
**"CI Green"** aggregation job.

### ⚠️ Footgun #2 — solo-approval trap
Do **NOT** require "1 approval" on a solo repo — GitHub forbids approving your
own PR, so you'd permanently block yourself. **The CI Green check is the gate;**
the review *skills* (`ce-code-review`, gstack `/review`) are the human reviewer.

---

## Deploy design — `.github/workflows/deploy.yml` (Lane B)

- **Trigger:** `push: master`, path-filtered to `apps/web/**`.
- **OIDC, no secrets:** `permissions: id-token: write` →
  `aws-actions/configure-aws-credentials@v4` with `role-to-assume: <ARN>`.
  Role trust policy locks `sub` to
  `repo:leocaseiro/notation-hero:ref:refs/heads/master`.
- **Web deploy:** `vite build` → `aws s3 sync apps/web/dist s3://<bucket> --delete`
  → CloudFront invalidation. `cancel-in-progress: false` (never cancel a
  half-done deploy — queue instead).
- **Least privilege:** because infra applies run **locally** for now, the CI
  deploy role only needs **S3 + CloudFront** perms (web deploy), NOT full infra
  rights.
- **Infra apply stays LOCAL** for the first milestone (watch the first deploy
  in the console). CI-driven `pulumi up` is a later hardening.

---

## AWS bootstrap (Wave 3)

1. **Human, console:** create an IAM user; attach a scoped policy for the first
   stack (Lambda + IAM role creation + CloudWatch Logs + later S3/CloudFront +
   the OIDC provider). Generate access keys.
2. **Local:** `aws configure` (keys + region) → unblocks `pulumi up`.
3. **`pulumi up`** the `infra/` stack → hello-world Lambda Function URL → hit the
   URL → confirm logs in **CloudWatch**.
4. **Pulumi also provisions** the GitHub OIDC provider + a CI deploy role
   (S3/CloudFront scope) → copy the role ARN into `deploy.yml`.

**OIDC provider is account-global** — if `token.actions.githubusercontent.com`
already exists in the account, `pulumi import` it instead of creating a
duplicate (otherwise the apply conflicts).

**Level-up option (not chosen, recorded):** IAM Identity Center (SSO) →
short-term local creds gives a "zero long-lived keys anywhere" story. Current
choice is IAM user + access keys (faster unblock); revisit if the portfolio
narrative wants the upgrade.

---

## Milestone context (why this is Alpha-rung work)

Per the feature freeze (2026-06-05), **Alpha = PWA rhythm game + minimum AWS +
Admin/CMS**, dogfooded on iPad via the WebMIDI shim. This pipeline is the
foundation that Alpha ships on: S3+CloudFront delivery, the first Lambda, and
the green-CI guardrail that keeps the feature track safe. Native iPad CoreMIDI,
Cognito accounts, and cross-device sync are **M1**, not now.

---

## Tooling status (verified 2026-06-06)

| Tool | State |
|---|---|
| bun | 1.3.11 ✅ |
| pulumi | 3.243.0 ✅ (logged in as `leocaseiro`) |
| aws CLI | 2.34.53 ✅ · **creds ❌ none · region ❌ none** (Wave-3 blocker) |
| node | 24.14.1 ✅ |
| gh | authed as `leocaseiro` (SSH); token lacks `workflow` scope — fine for SSH push |
| GitHub repo | `leocaseiro/notation-hero` does **not exist yet** |

---

## Open follow-ups (post-Wave-3, deferred)

- Advanced PR policy (Danger, VR-required-on-UI, Storybook-on-new-components):
  design via `/plan-eng-review` first. (Reference repo `~/Sites/alpha-drums`
  was cited in the handoff but is **not currently on disk** — source elsewhere.)
- CodeQL (free on public repos) for security scanning.
- Dependabot vs Renovate — confirm native bun support; else Renovate.
- CI-driven `pulumi up` with a broader-scoped OIDC role (after the local flow is solid).
