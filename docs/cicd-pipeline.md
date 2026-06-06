# NotationHero — CI/CD + AWS Pipeline Plan

> **Purpose:** canonical, in-repo source of truth for the CI/CD pipeline, AWS
> bootstrap, and the **multi-agent parallel build** of Track 2. Lives in this
> repo (not a sibling worktree) so **Track 1 (feature) agents can see it** and
> respect the file-ownership boundaries below.
> **Status:** Wave-1 baseline committed, then **realigned to the hexagonal
> (ports & adapters) layout** — green locally, **unpushed**. · **Updated:** 2026-06-07
> **Companions:** `scope.md` (requirements) · the CMS/area-K decision +
> hexagonal rationale live in `../affectionate-dewdney-42c19c/docs/cms-approach.md`
> (sibling worktree). Strategy/stack docs are in `pensive-boyd-6d17e3`.

---

## TL;DR

- **Public** GitHub repo `leocaseiro/notation-hero` + **proprietary LICENSE**
  (public = unlimited free Actions minutes; license keeps all rights).
- **Hexagonal monorepo** (bun 1.3.11): `core/*` (pure domain) ← `adapters/*`
  (AWS / DynamoDB / S3 / react-admin / …) ← `apps/*` (composition roots);
  `infra/` (Pulumi composition root); `packages/config` (shared ESLint).
- **CI** (`ci.yml`): install → lint → typecheck → test → build per layer.
  **Linux only**, dependency-aware path-filtering, concurrency-cancel, cached.
  iOS builds run **LOCAL**, never on GitHub-hosted macOS runners.
- **AWS creds:** IAM user + access keys for **local `pulumi up`**;
  **GitHub OIDC** for CI (no long-lived secrets in Actions).
- **First deliverable:** `pulumi up` deploys a **hello-world Lambda Function URL**
  (via `@adapters/aws` `LambdaWithUrl`), verified in CloudWatch — the smallest
  interview-tellable AWS story.
- **Branch protection** on `master`: require PR + green CI (single "CI Green" check).

---

## Architecture — hexagonal (ports & adapters)

Chosen deliberately as a Staff-FE **system-design portfolio piece** (the
"swappable backend" story): `core` depends on nothing; AWS/DynamoDB/S3/etc. are
adapters behind ports; apps are thin composition roots that wire them together.
See `../affectionate-dewdney-42c19c/docs/cms-approach.md` for the area-K (CMS =
React-Admin over a custom AWS backend) decision this layout serves.

| Layer | Dir | Rule |
|---|---|---|
| **Domain** | `core/<context>` (`@core/<context>`) | Pure TS. **No** AWS / React / HTTP imports. The real-time MIDI→verdict hot path calls core **directly** — never through an adapter. |
| **Adapters** | `adapters/<name>` (`@adapters/<name>`) | Implement core's ports against the outside world (Pulumi/AWS, DynamoDB, S3, React-Admin, AlphaTab, PixiJS). |
| **Apps** | `apps/<name>` (`@apps/<name>`) | Composition roots; one deploy target each (player-pwa, admin-spa, lambda-*). |
| **Infra** | `infra/` (`@notation-hero/infra`) | Pulumi composition root; composes `apps/*/infra.ts` + cross-cutting resources, instantiating `@adapters/aws` ComponentResources. |
| **Tooling** | `packages/config` (`@config/eslint`) | Shared ESLint flat config + plugin deps. |

**Granularity decision (refactor-proofing):** packages use **scoped names that
double as import specifiers** (`@core/scoring`, `@adapters/aws`). So
`import … from "@core/scoring"` never churns if a package is split/moved, and
adding a new context/adapter is **purely additive** (new folder + manifest; the
`core/*` / `adapters/*` glob picks it up). The accepted YAGNI = a few extra
`package.json` files now, to avoid a painful import-rewrite later.

---

## Constraints (locked)

| Constraint | Value |
|---|---|
| Package manager / runtime | **bun 1.3.11** |
| Default branch | **`master`** (not renamed to main) |
| Repo visibility | **Public** + proprietary `LICENSE` (all rights reserved) |
| Architecture | **Hexagonal** (ports & adapters); scoped workspace names |
| Actions runners | **`ubuntu-latest` only**; iOS builds LOCAL, never GitHub-hosted macOS |
| AWS account | **Legacy (pre-2025-07-15)** → Always-Free tiers |
| IaC | **Pulumi TypeScript** — primitives in `@adapters/aws`, composed in `infra/` |
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
WAVE 1 — SEED (done, committed in baby steps)   the shared trunk + hexagonal skeleton
  root bun workspace (apps/* adapters/* core/* packages/* infra) + tsconfig.base
  + LICENSE + .gitignore + packages/config (shared ESLint)
  + core/scoring (@core/scoring, pure domain, tested)
  + apps/player-pwa (Vite+React shell, green)
  + adapters/aws + infra/ (Pulumi composition-root stubs)
  + ci.yml (per-layer, dependency-aware, CI Green gate)   ← all green locally
        │  (baby commits on the working branch; not pushed yet)
        ▼
WAVE 2 — FAN-OUT (parallel, isolated git worktrees)   disjoint subtrees, clean merges
  Lane A  infra/** + adapters/aws/**   Pulumi hello-world Lambda Function URL
                                       (LambdaWithUrl ComponentResource + compose)
  Lane B  .github/workflows/deploy.yml  OIDC provider/role wiring + S3/CF deploy
  Lane C  repo meta                     README, CODEOWNERS, dependabot.yml, PR template, branch script
  Lane D  apps/player-pwa/**            landing polish (optional; hands src/** to Track 1)
        │  up to 4 PRs, each independently green-CI-gated
        ▼
WAVE 3 — INTEGRATION (serial, human-gated)
  1. HUMAN: create IAM user + access keys in console → aws configure   (the blocker)
  2. LOCAL: pulumi up  → hello-world Lambda Function URL → verify CloudWatch
  3. Pulumi provisions GitHub OIDC provider + deploy role → role ARN into deploy.yml
  4. merge green PRs → turn branch protection ON (checks now exist + have run)
```

> **Note:** area-K (the CMS — `apps/admin-spa`, `apps/lambda-cms-*`,
> `@adapters/dynamodb`, `@adapters/s3`, `@adapters/react-admin`) is **Track-4 /
> feature work**, not Track 2. Track 2 stops at: green CI, the AWS bootstrap, and
> the hello-world Lambda. Those packages get added (additively) when their
> features land.

**Why Wave 1 is serial:** the root manifest + base tsconfig + the workspace
shape are shared/foundational; two agents editing them = guaranteed conflict.
It is the common ancestor every Wave-2 lane branches from.

**Why Wave 2 parallelizes cleanly:** the lanes touch **disjoint directory
subtrees**; the shared hotspots (root manifest, `ci.yml`) are frozen by Wave 1.

---

## File-ownership map (the "agents don't collide" contract)

Every path has exactly **one owner**. This is the guarantee that parallel agents
(and Track 1 vs Track 2) never break each other.

| Path | Owner | Notes |
|---|---|---|
| root `package.json` / `bun.lock` / `tsconfig.base.json` / `.gitignore` / `LICENSE` | **Track 2 — FROZEN** | workspace shape is final; changes coordinated |
| `.github/workflows/ci.yml` | **Track 2** | per-layer filters already cover core/adapters/apps/infra |
| `packages/config/**` | **Track 2** | shared ESLint config |
| `infra/**` + `adapters/aws/**` | **Track 2 / Lane A** | Pulumi composition root + AWS ComponentResources |
| `.github/workflows/deploy.yml` | **Track 2 / Lane B** | OIDC + S3/CloudFront deploy |
| `README` / `CODEOWNERS` / `.github/dependabot.yml` / PR template / branch script | **Track 2 / Lane C** | repo meta |
| `core/**` (domain) | **Track 1 (feature)** | `@core/scoring` seeded by Track 2; further contexts are feature work |
| `apps/*/src/**` | **Track 1 (feature)** | app code; Track 2 seeded the `player-pwa` shell |
| `adapters/{dynamodb,s3,react-admin,alphatab,pixijs,http-client}/**` | **Track 1 / Track 4** | added with their features |

**Shared-file rule:** root manifest + `ci.yml` are written once and frozen.
`ci.yml` already wires per-layer jobs (core/adapters/app/infra) with
dependency-aware filters, so new packages are picked up by the `@core/*` /
`@adapters/*` / `@apps/*` globs **without editing `ci.yml`**.

**How agents stay safe:**
1. **Mechanical** — branch protection: nothing red merges to `master`.
2. **Structural** — single-owner per path (table above).
3. **Isolation** — each Wave-2 lane runs in its own git worktree.
4. **Diagnosability** — per-layer path-filtered CI points failures at the right layer.
5. **Reversibility** — small single-lane (baby) commits → one `git revert`.
6. **Lockfile** — bun **text** `bun.lock` (default 1.2+) merges cleanly across
   parallel PRs; never the binary `bun.lockb`.

---

## CI design — `.github/workflows/ci.yml`

- **Triggers:** `pull_request` + `push: master`.
- **Runner:** `ubuntu-latest` only.
- **Concurrency:** `group: ci-${{ github.ref }}`, `cancel-in-progress: true`.
- **Setup:** `oven-sh/setup-bun@v2` pinned to `1.3.11`; cache
  `~/.bun/install/cache` keyed on `bun.lock`; `bun install --frozen-lockfile`.
- **Dependency-aware path filters** (`dorny/paths-filter`) emit `core` /
  `adapters` / `app` / `infra` outputs. A consumer is re-checked when something
  it depends on changes: **`app` ⊇ apps + core + packages**; **`infra` ⊇ infra +
  adapters + packages**; root files trip everything.
- **Per-layer jobs**, each `lint → typecheck → test → build` via bun's
  scoped-name filter: `@core/*`, `@adapters/*`, `@apps/*`, `@notation-hero/infra`.
- **Single required check — "CI Green":** an aggregation job
  (`if: always()`, `needs: [core, adapters, app, infra]`) that fails if any
  needed job **failed/cancelled** (skipped is OK). Set **this one job** as the
  required status check in branch protection.

> **Test policy:** app shells use `vitest run --passWithNoTests` (logic lives in
> `core`); **core packages keep strict `vitest run`** so a deleted test fails CI.

### ⚠️ Footgun #1 — skipped-required-check deadlock
If you mark a per-layer job (e.g. `app`) as a required check, a PR that doesn't
touch its paths *skips* it → GitHub waits forever for a check that never
reports → PR can never merge. **Fix:** require only the always-running
**"CI Green"** aggregation job.

### ⚠️ Footgun #2 — solo-approval trap
Do **NOT** require "1 approval" on a solo repo — GitHub forbids approving your
own PR, so you'd permanently block yourself. **The CI Green check is the gate;**
the review *skills* (`ce-code-review`, gstack `/review`) are the human reviewer.

---

## Deploy design — `.github/workflows/deploy.yml` (Lane B)

- **Trigger:** `push: master`, path-filtered to `apps/player-pwa/**`.
- **OIDC, no secrets:** `permissions: id-token: write` →
  `aws-actions/configure-aws-credentials@v4` with `role-to-assume: <ARN>`.
  Role trust policy locks `sub` to
  `repo:leocaseiro/notation-hero:ref:refs/heads/master`.
- **Web deploy:** `bun run --filter='@apps/player-pwa' build` →
  `aws s3 sync apps/player-pwa/dist s3://<bucket> --delete` → CloudFront
  invalidation. `cancel-in-progress: false` (never cancel a half-done deploy).
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

## Open follow-ups (post-Wave-3, deferred)

- Advanced PR policy (Danger, VR-required-on-UI, Storybook-on-new-components):
  design via `/plan-eng-review` first. (Reference repo `~/Sites/alpha-drums`
  was cited in the handoff but is **not currently on disk** — source elsewhere.)
- CodeQL (free on public repos) for security scanning.
- Dependabot vs Renovate — confirm native bun support; else Renovate.
- CI-driven `pulumi up` with a broader-scoped OIDC role (after the local flow is solid).
- ESLint **import-boundary rule** to enforce core's purity (no AWS/React/HTTP in
  `core/*`) at lint time — strengthens the hexagonal guarantee.
