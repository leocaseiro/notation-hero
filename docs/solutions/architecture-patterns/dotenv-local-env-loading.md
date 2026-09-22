---
title: Local-only .env loading in a Lambda-first NestJS app
date: 2026-07-02
category: architecture-patterns
module: server
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - 'Adding a local entry point (nest start listener, tsx script) that reads process.env in the server'
  - 'A local run throws because DATABASE_URL (or another env var) is undefined, but the deployed Lambda works'
  - 'Deciding how a Lambda-first app should load env in local dev versus production'
tags: [dotenv, env-loading, nestjs, lambda, local-dev, neon]
---

# Local-only .env loading in a Lambda-first NestJS app

## Context

The server runs in two places: **locally** via `nest start` (`server/src/main.ts`) and the `tsx` seed runner (`server/src/adapters/neon-postgres/seed.util.ts`), and **on AWS Lambda** via `server/src/entry/http.handler.ts`. Neither `nest start` nor `tsx` loads `server/.env` on its own, so `process.env.DATABASE_URL` was `undefined` at request time and `GET /api/catalog` threw `DATABASE_URL is not set` — even though a valid `.env` sat right there. On Lambda the same code worked, because the platform injects env vars.

## Guidance

Load `.env` **only in the local entry points**, and let the platform inject env everywhere else.

- Add `import 'dotenv/config';` as the **first import** of each local entry (`main.ts`, `seed.util.ts`), before any module that reads `process.env`.
- Do **not** add it to the Lambda entry (`http.handler.ts`) — Lambda and CI inject env, and no `.env` file is present there.
- `dotenv`'s `override:false` default means that even when `dotenv/config` runs where a real env var is already set (CI, Lambda), it never clobbers the injected value — so the import is a safe no-op outside local dev.
- Put `dotenv` in `dependencies`, not `devDependencies`: the `tsx` seed runner is a runtime entry point that needs it outside the dev toolchain.

```ts
// server/src/main.ts — LOCAL listener only
import 'dotenv/config'; // loads server/.env for local dev; no-op on Lambda/CI (env injected)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// ...
```

## Why This Matters

A `.env` file that nothing loads is a silent trap: the file exists, looks configured, and the app still fails with a confusing "not set" error. Scoping the loader to the local entries keeps production honest (env stays platform-injected, auditable, and not silently overwritten) while making `pnpm start` and `pnpm db:seed` just work locally.

Reaching for `@nestjs/config` or `t3-env` here is heavier than needed. `@nestjs/config` couples env loading into the Nest module graph — which the Lambda entry also boots — and `t3-env` only validates: it does not load, so it still needs a loader underneath it. `dotenv` is the minimal loader; typed validation (zod / t3-env) is a separate, deferrable layer.

## When to Apply

- Any new local entry point in the server that reads `process.env`.
- When a local run fails on a missing env var but the deployed Lambda works.

## Examples

- **Bug:** `pnpm start` → `Error: DATABASE_URL is not set` on `GET /api/catalog`, despite `server/.env` existing.
- **Fix:** `import 'dotenv/config'` at the top of `main.ts` (and `seed.util.ts` for `pnpm db:seed`); `dotenv` added to `dependencies`. The Lambda entry stays untouched.
- **Non-example:** do not put `dotenv/config` in `http.handler.ts` — that entry must rely on injected env.

## Related

- Decision registry `L12-envload` (the decision record) and `L12-env` (deferred typed env validation).
- Project memory: the Neon dev-branch rebuild recipe (`notation_hero_neon_dev_branch_rebuild`).
