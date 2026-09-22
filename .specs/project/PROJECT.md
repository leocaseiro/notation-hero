# PROJECT — Notation Hero

> **Lean setup.** This file is a pointer, not a source of truth. The authoritative
> project docs already exist (see below) — `.specs/` only holds spec-driven
> feature artifacts.

## What it is

Notation Hero is an instrument-agnostic music-notation **learning** app (drum-first).
Learners find a piece in a catalog and practice it with live notation + scoring.
Built as a portfolio + learning project on AWS, targeting the $0 free tier.

## Stack (high level)

- **Frontend:** ⛔ _Superseded 2026-07-08 — the "No Next.js (locked)" call was reversed._
  **Next.js 16** (App Router, on Vercel) is the product PWA (`web/`); `client/` is now the design
  system (Vite + React 19 + TanStack + Tailwind v4, CSS-first `@theme`, Storybook). ADR
  `docs/decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md`; source of truth =
  `docs/decisions/decision-registry.md`.
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
