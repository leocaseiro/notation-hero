# NotationHero — CI/CD + AWS Pipeline Plan

> **Purpose:** the CI/CD + AWS-bootstrap + branch-protection companion to the
> canonical build plan. Lives in-repo so any agent can see the pipeline + the
> file-ownership boundaries.
> **Status:** **U1 (Layout 4 skeleton) committed + green locally, unpushed.**
> · **Updated:** 2026-06-07
> **Authoritative for structure & build sequence:**
> `../charming-curran-f72274/docs/plans/2026-06-07-001-feat-cms-k-build-plan.md`
> (Output Structure + units U1–U9). This doc owns the *pipeline*; the plan owns
> the *layout and the CMS build*. `scope.md` = requirements.

---

## TL;DR

- **Public** GitHub repo `leocaseiro/notation-hero` + **proprietary LICENSE**.
- **Layout 4 (Hexagonal) monorepo**, bun 1.3.11, workspaces
  `["core/*", "adapters/*", "apps/*", "infra"]`. Packages are named
  `@notation-hero/*`; intra-repo imports use tsconfig **path aliases**
  `@core/* @adapters/* @apps/*`.
- **Layer boundaries enforced in CI** by **dependency-cruiser** (`depcheck`)
  + an `.eslintrc.cjs` `no-restricted-imports` guard on `core/`. Both
  **validated** (probe: `@aws-sdk` in `core/` → ESLint fails;
  `core → apps` → dependency-cruiser fails).
- **CI** (`ci.yml`): `quality` (lint → typecheck → depcheck → test) + `build`,
  path-filtered, **Linux only**, concurrency-cancel, cached, single required
  **"CI Green"** check. iOS builds run **LOCAL**, never GitHub-hosted macOS.
- **AWS creds:** IAM user + access keys for **local `pulumi up`**;
  **GitHub OIDC** for CI (no long-lived secrets in Actions).
- **First AWS deliverable:** a **hello-world Lambda Function URL** (the
  `@notation-hero/adapters-aws` `LambdaWithUrl` component, composed in `infra/`),
  verified in CloudWatch — the smallest interview-tellable AWS story.
- **Branch protection** on `master`: require PR + the single "CI Green" check.

---

## Layout 4 (Hexagonal) — what U1 established

Chosen as a Staff-FE **system-design portfolio piece** (the "swappable backend"
story). See the canonical plan's *Output Structure* for the full tree; the
shape U1 froze:

| Layer | Dir / package | Rule (enforced by `depcheck` + ESLint) |
|---|---|---|
| **Domain** | `core/` → `@notation-hero/core` (subdirs `lesson/`, `shared/kernel/`) | Pure TS. **No** AWS / React / HTTP / adapters / apps imports. |
| **Adapters** | `adapters/<name>` → `@notation-hero/adapters-<name>` | Implement core's ports against the world (Pulumi/AWS, DynamoDB, S3, React-Admin). May import `core`, not `apps`. |
| **Apps** | `apps/<name>` → `@notation-hero/<name>` | Composition roots; one deploy target each. May import `core` + `adapters`. |
| **Infra** | `infra/` → `@notation-hero/infra` | Pulumi composition root; composes `apps/*/infra.ts` + cross-cutting resources. |

**Imports vs package names:** code imports via **path aliases** (`@core/lesson/…`,
resolved by `tsconfig.base.json` `paths`); the workspace **package name** is
`@notation-hero/*`. Two different things — aliases are intra-repo ergonomics,
names are npm identity.

**U1 files (the frozen skeleton):** root `package.json` (workspaces + scripts
`lint`/`typecheck`/`test`/`depcheck`/`build`), `tsconfig.base.json` (path
aliases, strict, `bundler`), `tsconfig.json` (root solution config, `files: []`,
used by dependency-cruiser for alias resolution), `.dependency-cruiser.cjs`,
`.eslintrc.cjs`, `.gitignore`, `LICENSE`, `.github/workflows/ci.yml`,
`core/ adapters/ apps/ .gitkeep` + an `@notation-hero/infra` stub package.

> **bun-workspace quirk (resolved):** the non-glob `infra` workspace entry
> requires an `infra/package.json` to exist or `bun install` errors
> "Workspace not found". U1 ships a minimal infra stub package; U9 fills it.
> (The `core/* adapters/* apps/*` globs match zero dirs without erroring.)

---

## Constraints (locked)

| Constraint | Value |
|---|---|
| Package manager / runtime | **bun 1.3.11** |
| Default branch | **`master`** |
| Repo visibility | **Public** + proprietary `LICENSE` |
| Architecture | **Layout 4 (Hexagonal)**; `@notation-hero/*` names; `dependency-cruiser`-enforced |
| Actions runners | **`ubuntu-latest` only**; iOS builds LOCAL, never GitHub-hosted macOS |
| AWS account | **Legacy (pre-2025-07-15)** → Always-Free tiers |
| IaC | **Pulumi TypeScript** (`@pulumi/aws` v7) — components in `adapters/aws`, composed in `infra/` |
| Web hosting | **S3 (private) + CloudFront + OAC** |
| Local AWS creds | IAM user + access keys (`aws configure`) |
| CI AWS creds | **GitHub OIDC** — zero long-lived secrets in Actions |

**Actions-minutes facts:** public repos = unlimited free Linux minutes.
macOS = 10× multiplier → iOS builds on GitHub-hosted macOS would torch any
private budget; kept local regardless to build the right habit.

---

## The multi-agent build: a 3-wave pipeline

Hard ordering (a DAG): can't require a CI check before it exists + has run;
can't OIDC-deploy before Pulumi creates the OIDC provider; can't `pulumi up`
before AWS creds exist (a human step). So: **parallelize the leaves, serialize
the spine.**

```
WAVE 1 — U1 SKELETON (done, green, unpushed)
  Layout 4 root config + dependency-cruiser + .eslintrc.cjs + ci.yml + empty
  core/ adapters/ apps/ + infra stub. Layer guards validated by probe.
        │
        ▼
WAVE 2 — FAN-OUT (parallel, isolated worktrees)   the CMS build = K-plan units U2–U9
  Feature track (K plan)   U2 core domain · U3 adapters/aws (Pulumi components) ·
                           U4 runtime adapters · U5–U7 lambdas · U8 admin-spa · U9 infra
  Track-2 (this doc)       deploy.yml + OIDC wiring · repo meta (README/CODEOWNERS/
                           dependabot/PR template/branch script)
        │  PRs, each green-CI-gated (depcheck blocks any layer violation)
        ▼
WAVE 3 — INTEGRATION (serial, human-gated)
  1. HUMAN: create IAM user + access keys in console → aws configure   (the blocker)
  2. LOCAL: pulumi up → hello-world Lambda Function URL → verify CloudWatch
  3. Pulumi provisions GitHub OIDC provider + deploy role → role ARN into deploy.yml
  4. merge green PRs → turn branch protection ON (checks now exist + have run)
```

> **Scope split:** the **K-plan units U2–U9** build the CMS (core domain →
> adapters → lambdas → admin SPA → Pulumi composition) — that's the feature
> track and a **separate task**. **This doc / Track 2** owns the repo-config
> layer, CI, the AWS-creds bootstrap, `deploy.yml`/OIDC, and branch protection.

---

## File-ownership map (the "agents don't collide" contract)

| Path | Owner |
|---|---|
| root `package.json` / `bun.lock` / `tsconfig*.json` / `.gitignore` / `LICENSE` | **Track 2 — workspace shape FROZEN** |
| `.eslintrc.cjs` / `.dependency-cruiser.cjs` | **Track 2** (layer-enforcement config) |
| `.github/workflows/*` | **Track 2** (CI already covers core/adapters/apps/infra; new packages need no `ci.yml` edit) |
| `core/**` | **K-plan U2** (domain) — pure; `depcheck` forbids AWS/React/adapter/app imports |
| `adapters/aws/**` + `infra/**` | **K-plan U3/U9** — Pulumi components + composition (Track 2 provides the AWS-creds bootstrap they deploy with) |
| `adapters/{dynamodb,s3,react-admin}/**` | **K-plan U4** |
| `apps/lambda-cms-*/**` | **K-plan U5–U7** |
| `apps/admin-spa/**` | **K-plan U8** |
| `apps/player-pwa/src/**` | **Track 1 (player)** — separate plan; U1/U9 only stub it |

**How agents stay safe:**
1. **Mechanical** — branch protection: nothing red merges to `master`.
2. **Layer integrity** — `depcheck` (dependency-cruiser) fails any PR that
   crosses a Hexagonal boundary; ESLint blocks AWS/React in `core/`.
3. **Single-owner per path** (table above); the workspace shape is frozen.
4. **Diagnosability** — path-filtered CI skips irrelevant work.
5. **Reversibility** — small (baby) commits → one `git revert`.
6. **Lockfile** — bun **text** `bun.lock` merges cleanly across parallel PRs.

---

## CI design — `.github/workflows/ci.yml`

- **Triggers:** `pull_request` + `push: master`. **Runner:** `ubuntu-latest`.
- **Concurrency:** `group: ci-${{ github.ref }}`, `cancel-in-progress: true`.
- **Setup:** `oven-sh/setup-bun@v2` pinned `1.3.11`; cache `~/.bun/install/cache`
  keyed on `bun.lock`; `bun install --frozen-lockfile`.
- **Path filter** (`dorny/paths-filter`): `code` (any source/config) gates
  `quality`; `apps` (apps + core + adapters) gates `build`. A **docs-only PR
  skips both** → the required check still passes.
- **Jobs:** `quality` = `lint → typecheck → depcheck → test` (one install);
  `build` = `bun run build` across deploy targets (split to a per-app matrix
  when build time warrants).
- **Single required check — "CI Green":** aggregation job (`if: always()`,
  `needs: [quality, build]`) failing only on a real failure/cancellation
  (skipped is OK). Set **this one job** as the required status check.

### ⚠️ Footgun #1 — skipped-required-check deadlock
If a per-layer/per-job check is itself required, a PR that skips it (path
filter) leaves a never-reported check → PR can't merge. **Fix:** require only
the always-running **"CI Green"** aggregation job.

### ⚠️ Footgun #2 — solo-approval trap
Do **NOT** require "1 approval" on a solo repo — GitHub forbids approving your
own PR, so you'd permanently block yourself. **The CI Green check is the gate;**
the review *skills* (`ce-code-review`, gstack `/review`) are the human reviewer.

---

## Deploy design — `.github/workflows/deploy.yml` (Wave 2, Track 2)

- **Trigger:** `push: master`, path-filtered to the relevant `apps/<app>/**`.
- **OIDC, no secrets:** `permissions: id-token: write` →
  `aws-actions/configure-aws-credentials@v4` with `role-to-assume: <ARN>`.
  Role trust policy locks `sub` to
  `repo:leocaseiro/notation-hero:ref:refs/heads/master`.
- **Web deploy:** `bun run --filter='@notation-hero/<app>' build` →
  `aws s3 sync apps/<app>/dist s3://<bucket> --delete` → CloudFront
  invalidation. `cancel-in-progress: false` (never cancel a half-done deploy).
- **Least privilege:** infra applies run **locally** for now, so the CI deploy
  role only needs **S3 + CloudFront** perms, NOT full infra rights.
- **Infra apply stays LOCAL** for the first milestone. CI-driven `pulumi up` is
  a later hardening.

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
foundation Alpha ships on: the layer-enforced monorepo, S3+CloudFront delivery,
the first Lambda, and the green-CI guardrail. The CMS (area K) is the #3
interview piece; native iPad CoreMIDI, Cognito accounts, and cross-device sync
are **M1**, not now.

---

## Tooling status (verified 2026-06-07)

| Tool | State |
|---|---|
| bun | 1.3.11 ✅ |
| pulumi | 3.243.0 ✅ (logged in as `leocaseiro`) |
| aws CLI | 2.34.53 ✅ · **creds ❌ none · region ❌ none** (Wave-3 blocker) |
| node | 24.14.1 ✅ |
| gh | authed as `leocaseiro` (SSH); token lacks `workflow` scope — fine for SSH push |
| GitHub repo | `leocaseiro/notation-hero` does **not exist yet** |

---

## Open follow-ups (deferred)

- `deploy.yml` + OIDC (Wave 2, Track 2) — after the local `pulumi up` flow works.
- Per-app CI build matrix — when build time warrants (currently one `build` job).
- Advanced PR policy (Danger, VR-required-on-UI, Storybook-on-new-components)
  via `/plan-eng-review`. (`~/Sites/alpha-drums`, cited in the handoff, is **not
  on disk** — source elsewhere.)
- CodeQL (free on public repos); Dependabot vs Renovate (confirm bun support).
- CI-driven `pulumi up` with a broader-scoped OIDC role (after local flow solid).
