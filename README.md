# Notation Hero

A Progressive Web App rhythm game for practising music notation, backed by an
AWS-deployed admin/CMS. Built as a hexagonal **pnpm-workspaces** monorepo — a
deliberate "swappable backend" system-design portfolio piece.

> **Status:** early foundation. The first **deployable AWS slice** (NH-206) is in
> place — a NestJS API on Lambda + a Vite React SPA, both served from a single
> CloudFront distribution. Remaining domain packages materialise with their specs.
> The authoritative record of every decision is the
> [decision registry](docs/decisions/decision-registry.md).

## Stack

- **Monorepo:** pnpm workspaces (`pnpm -r`) — no Nx/Turborepo
- **Client:** Vite + React, TanStack Router/Query, Tailwind (the PWA)
- **Server:** NestJS on AWS Lambda (serverless-express "lambdalith") — SWC compile → esbuild bundle
- **Language:** TypeScript (strict)
- **Tests:** Vitest (client + server + infra); `node --test` for the `tooling/` CI scripts
- **Cloud:** AWS via Pulumi (TypeScript) — **one CloudFront distribution, two origins**:
  `/*` → private S3 (SPA static, via Origin Access Control); `/api/*` → Lambda Function URL
  (locked to `AWS_IAM`, reachable only by CloudFront via Origin Access Control)
- **CI / CD:** GitHub Actions — `ci.yml` (lint / typecheck / test / build); `deploy.yml`
  runs `pulumi up` on `master` **after CI passes**, via **GitHub → AWS OIDC** (no stored keys).
  `pulumi preview` is local-only. Local deploys still work — see **Deploy (AWS)** below.

## Layout

| Path      | Package                 | Role                                    |
| --------- | ----------------------- | --------------------------------------- |
| `client/` | `@notation-hero/client` | Vite React SPA (the PWA)                |
| `server/` | `@notation-hero/server` | NestJS API (runs locally and on Lambda) |
| `shared/` | `@notation-hero/shared` | Cross-cutting types / contracts         |
| `infra/`  | `@notation-hero/infra`  | Pulumi composition root                 |

Tests and stories live **co-located** next to their source — never in `__tests__/`
or `stories/` trees (CI enforces this via `tooling/check-layout.sh`).

## Develop (quality gates)

```bash
pnpm install       # install workspace deps
pnpm lint          # pnpm -r run lint
pnpm typecheck     # pnpm -r run typecheck
pnpm test          # pnpm -r run test   (Vitest, all workspace packages)
pnpm test:tooling  # node --test  (tooling/ CI scripts — outside the workspace)
pnpm build         # pnpm -r run build
```

The default branch is **`master`**. Never commit or push with `--no-verify` —
Lefthook runs the layout guard and checks locally before CI does.

## Run locally

The client and server are separate dev servers. Run the **server on port 3001** and
the **client on port 3000**; Vite proxies `/api/*` to the server (see
`client/vite.config.ts`), so the app is same-origin locally — exactly as it is behind
CloudFront in production.

```bash
# terminal 1 — API (NestJS, port 3001)
PORT=3001 pnpm --filter @notation-hero/server run start:dev

# terminal 2 — SPA (Vite, port 3000; proxies /api → :3001)
pnpm --filter @notation-hero/client run dev
```

Open the URL Vite prints (defaults to <http://localhost:3000>; Vite picks the next free port if
3000 is taken) — the About page fetches `/api/catalog` live through the proxy. Hit the API
directly with `curl http://localhost:3001/api/catalog`.

## Deploy (AWS)

Infrastructure is **Pulumi (TypeScript)** with a self-managed **S3 state backend**
(`s3://notation-hero-pulumi-state-apse2`, pinned in `infra/Pulumi.yaml`). There are two
ways to deploy — **CI/CD** (default) and **local**.

### CI/CD — GitHub Actions + AWS OIDC

`.github/workflows/deploy.yml` deploys with **no stored AWS keys**, assuming the
`notation-hero-ci-deploy` role via **GitHub → AWS OIDC**:

- **Push to `master` →** `pulumi up`, but only after the **CI** workflow succeeds on `master`
  (a red commit never deploys).
- **`pulumi preview` is local-only** — run it before merging infra changes (the PR-triggered
  preview was removed in NH-206 review #3; see
  `docs/specs/2026-06-24-nh-206-oidc-deploy-hardening.md`).

One-time admin bootstrap of the OIDC provider + role: `docs/runbooks/aws-ci-oidc-bootstrap.sh`
(permissions in `docs/runbooks/aws-iam-ci-deploy.json`). CI config = the `PULUMI_CONFIG_PASSPHRASE`
secret + the `AWS_DEPLOY_ROLE_ARN` / `AWS_REGION` / `PULUMI_STATE_BUCKET` variables.

### Local

Local deploys run as the dedicated `notation-hero-pulumi-local` IAM user — **never as an
admin identity**. That user needs S3 (site + state buckets) + CloudFront +
`lambda:AddPermission` rights (`docs/runbooks/aws-iam-pulumi-local-deploy.json`); granting
them is a one-time IAM task, separate from the deploy itself.

Build both artifacts, preview, then deploy:

```bash
export PULUMI_CONFIG_PASSPHRASE=…                        # stops the repeated passphrase prompts
pnpm --filter @notation-hero/server run build:lambda     # → server/dist-lambda
pnpm --filter @notation-hero/client run build            # → client/dist
pnpm --filter @notation-hero/infra run pulumi:preview    # dry-run the plan (no changes)
pnpm --filter @notation-hero/infra run pulumi:up         # create / update AWS (~15 min for CloudFront)
```

Verify against the **CloudFront URL** (not the raw Lambda URL):

```bash
curl "$(pulumi -C infra stack output cloudfrontUrl)"                # SPA index → 200 HTML
curl "$(pulumi -C infra stack output cloudfrontUrl)/api/catalog"  # live JSON
# the raw Function URL is AWS_IAM-locked, so a direct unsigned call should be 403:
curl -s -o /dev/null -w '%{http_code}\n' "$(pulumi -C infra stack output functionUrl)"
```

Tear down at any time (the slice stays within AWS always-free tiers either way):

```bash
pnpm --filter @notation-hero/infra run pulumi:destroy
```

## Documentation

- [AGENTS.md](AGENTS.md) — the contributor/agent contract (layout, run commands, conventions)
- [docs/decisions/decision-registry.md](docs/decisions/decision-registry.md) — every decision, its status, and what enforces it

## License

Proprietary — see [LICENSE](LICENSE).
