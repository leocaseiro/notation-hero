# Notation Hero

A Progressive Web App rhythm game for practising music notation, backed by an
AWS-deployed admin/CMS. Built as a hexagonal **pnpm + Nx** monorepo — the
architecture is a deliberate "swappable backend" system-design portfolio piece.

> **Status:** early foundation. Tooling and CI are landing first; domain packages
> materialise with their specs. The authoritative record of every decision and its
> status is the [decision registry](docs/decisions/decision-registry.md).

## Stack

- **Monorepo:** pnpm workspaces + [Nx](https://nx.dev) (`affected`, computation cache, module-boundary tags)
- **Language:** TypeScript — strict + composite + project references + `isolatedDeclarations`
- **Tests:** Node's built-in runner (`node --test`, type-stripping) today; Vitest is a deferred lane
- **Architecture:** Hexagonal — `core/` (pure domain) → `adapters/` → `apps/` → `infra/`
- **Data:** Neon Postgres + JSONB for the song/lesson catalogue; DynamoDB for per-user data
- **Cloud:** AWS via Pulumi (TypeScript); S3 + CloudFront for web delivery; Lambda for the API
- **CI/CD:** GitHub Actions, path-filtered `nx affected`, GitHub OIDC for deploys (zero long-lived secrets)

## Layout

| Path | Package | Role |
|---|---|---|
| `core/*` | `@notation-hero/core` | Pure domain — no AWS / React / HTTP imports |
| `adapters/*` | `@notation-hero/adapters-*` | Implement core's ports against the world |
| `apps/*` | `@notation-hero/*` | Composition roots; one deploy target each |
| `infra/` | `@notation-hero/infra` | Pulumi composition root |

Tests and stories live **co-located** next to their source — never in `__tests__/`
or `stories/` trees (CI enforces this via `tooling/check-layout.sh`).

## Develop

```bash
pnpm install            # install workspace deps
pnpm lint               # nx run-many --target=lint
pnpm typecheck          # nx run-many --target=typecheck
pnpm test               # nx run-many --target=test   (node --test)
pnpm build              # nx run-many --target=build
pnpm depcheck           # dependency-cruiser boundary + cycle scan
```

Run only the subset affected by your change against `master`:

```bash
pnpm nx affected -t lint typecheck test build --base=origin/master --head=HEAD
```

The default branch is **`master`**. Never commit or push with `--no-verify` —
Lefthook runs the layout guard and `nx affected` locally before CI does.

## Documentation

- [AGENTS.md](AGENTS.md) — the contributor/agent contract (layout, run commands, conventions)
- [docs/decisions/decision-registry.md](docs/decisions/decision-registry.md) — every decision, its status, and what enforces it

## License

Proprietary — see [LICENSE](LICENSE).
