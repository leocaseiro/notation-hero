# PROJECT — Notation Hero

> **Lean setup.** This file is a pointer, not a source of truth. The authoritative
> project docs already exist (see below) — `.specs/` only holds spec-driven
> feature artifacts.

## What it is

Notation Hero is an instrument-agnostic music-notation **learning** app (drum-first).
Learners find a piece in a catalog and practice it with live notation + scoring.
Built as a portfolio + learning project on AWS, targeting the $0 free tier.

## Stack (high level)

- **Frontend:** Vite SPA + React 19 + TanStack Router/Query + Tailwind v4
  (CSS-first `@theme`). **No Next.js** (locked, 2026-06-18).
- **Backend:** NestJS (hexagon/DDD inside), Lambda entry points.
- **Data:** DynamoDB (per-user) + Neon Postgres/JSONB (catalog).
- **Infra:** Pulumi (AWS); auth via Cognito.

## Source-of-truth docs (read these, not this file)

- `AGENTS.md` — tooling + conventions (pnpm workspaces, folders-in-one-app, co-location, naming).
- `docs/decisions/decision-registry.md` + `docs/decisions/` — ADRs.
- `docs/specs/`, `docs/wireframe/`, `docs/mockups/` — feature + visual specs.
- `CLAUDE.md` — coding guidelines. `STRATEGY.md`, `CONCEPTS.md` — product/domain.

## Why `.specs/` exists

First use of the `tlc-spec-driven` skill (2026-06-24). `.specs/` complements —
does not replace — the docs above. Tracking lives in Jira (project **NH**).
