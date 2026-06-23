# FE Framework Spike — Next.js (one source, two build targets)

> **Status:** ✅ **CONFIRMED 2026-06-16 by leocaseiro** · **Created:** 2026-06-16 · **Owner:** leocaseiro · **Ticket:** [NH-185](https://leocaseiro.atlassian.net/browse/NH-185) · **ADR:** [`../decisions/2026-06-16-fe-framework-nextjs-adr.md`](../decisions/2026-06-16-fe-framework-nextjs-adr.md)
> **Driver:** résumé / job-hunt — target roles award points for **Next.js**; **SSR + React-hydration** wanted as a portfolio showcase.
> **Companions:** [`docs/design-stack.md`](../design-stack.md) · [`docs/feature-freeze.md`](../feature-freeze.md) (H-4 host, I-3 Capacitor) · [`docs/aws-learning-map.md`](../aws-learning-map.md) · [`docs/decisions/decision-registry.md`](../decisions/decision-registry.md)
> **Reverses:** the 2026-06-02 stack-pick (Capacitor + Vite + React 19; Next.js rejected) — see _Prior decision_. New info: that rejection was of **SSR Next.js**; **static-export + one-source** was never evaluated.

## Decision

**Adopt Next.js (App Router) as a single front-end source (`apps/notation-hero`) built to two targets:**

1. **Web → SSR** via **OpenNext → Lambda + CloudFront**, provisioned in **Pulumi**, on AWS free-tier. Server-render + hydration → SEO + the portfolio showcase.
2. **iOS / Android → static-export** (`output:'export'`) → **Capacitor** native shell. No server; offline-capable.

Build the **catalog routes first** (SSR is most valuable there). Player routes migrate into the same app from the fork over time. **No Amplify** (it would sideline Pulumi + hide the AWS depth that is the job-hunt goal). **Not a micro-frontend; not two apps.**

## TL;DR

One Next.js codebase, two `next build` modes (SSR for web, static for Capacitor), one router, one state model. Shared `core` + `adapters`. Catalog-first. ~$0 on AWS free-tier, keeps Pulumi as the single IaC.

## Prior decision (via `/ce-sessions`, 2026-06-16)

5 sessions reviewed (2026-06-02 → 06-10). Capacitor was **evaluated and chosen** (MAUI / Unity / Godot rejected); **Next.js was rejected for conflicting with Capacitor**:

- **Stack-pick session** — `drum-tutor-clone`, worktree `serene-grothendieck-fb5e67`, 2026-06-02 — chose **Capacitor + Vite + React 19**; "why not Next.js" captured in `stack-brainstorm.md`. leocaseiro: _"I am happy with that. No discussions on Next.js with Capacitor."_
- **Locked** in the `/office-hours` session (worktree `pensive-boyd-6d17e3`) → `design-stack.md` APPROVED; reaffirmed in the **v1 Feature Freeze** (worktree `distracted-payne-ffafa7`).

**Why reversed:** the rejection was of **SSR Next.js**. **Static-export Next.js + a one-source/two-targets build** was never evaluated, and it resolves the Capacitor conflict while delivering the résumé driver.

## Findings

### F-1 — Capacitor ⇒ static build (hard constraint)
Capacitor loads a static `dist/` in a WebView; **no server runtime**. SSR can't run *inside the native app* → the native build must be static. SSR is a **web-only** enhancement.

### F-2 — One source, two build targets (chosen shape)
`output` is a **build-time** switch, not a runtime toggle (`isSsrEnabled = !isCapacitor()` was the right intent, wrong layer):
- `next.config.mjs`: `output: process.env.BUILD_TARGET === 'capacitor' ? 'export' : undefined`.
- `build:web` → SSR; `build:ios`/`:android` → export → `out/` → `npx cap copy`.
- **One router, one state model, one component tree.** Shared via `core`/`adapters` (build-time) and the backend (data). **No micro-frontend; no cross-app state bridge.**
- _Optional later:_ split a lean SEO-only marketing app if the game bundle ever hurts catalog page-load (route-level code-splitting likely makes this unnecessary). Additive — the hexagon keeps catalog logic in `core`/`adapters`.

### F-3 — Free-tier SSR on AWS, keeping Pulumi
**OpenNext → Lambda + CloudFront**: compiles Next SSR to a Lambda + static assets; **you wire it in Pulumi**. Always-free Lambda (1M req) + CloudFront (1 TB) ⇒ ~$0. **Amplify** has a free SSR allowance but provisions its own infra (**not in Pulumi**) and hides the IAM/CloudFront/Lambda depth → rejected.

### F-4 — 2026 free tiers (verified)
Perpetual Always-Free (every account): CloudFront 1 TB egress + 10M req; Lambda 1M req + 400K GB-s; DynamoDB 25 GB; SNS/SQS 1M; Cognito 10k MAU. S3 5 GB (12-mo → pennies). New accounts also get a $200 / 6-month credit pool. EC2 has no perpetual free tier (avoid). ⇒ static + SSR both ≈ **$0/mo** at this scale.

### F-5 — Hexagon fit
FE = one `app` in `apps/`. `core` / `adapters` / `infra` untouched (machine-enforced; `FOLD-hex` locked). The SSR Lambda+CloudFront is added in `infra/` (Pulumi) and never touches `core`/`adapters`.

### F-6 — Routing
One source = **one router**, **no subdomain needed**. Web served at one domain via CloudFront; the native app has no URL (loads the bundle locally). Capacitor static build needs `basePath`/`trailingSlash` care for the `capacitor://localhost` scheme (or `HashRouter`-style paths).

### F-7 — Static-export vs SSR
- **Static-export:** keeps App Router, routing, components, client interactivity, build-time SSG/RSC. Loses runtime SSR, ISR, server actions, route handlers, middleware.
- **SSR (web build):** per-request render + hydration → SEO + portfolio piece.
- **Constraint:** any page shipping in the **iOS (static) build must render client-side**; `isCapacitor()` selects the *data path* (client fetch vs server render), SSR is the web bonus.

## Implementation notes (for the build phase)

- `next.config.mjs`: conditional `output`, `images.unoptimized: true` (export), consider `trailingSlash: true` for Capacitor.
- `capacitor.config.ts`: `webDir: 'out'`; `npx cap copy ios|android`.
- App Router server components render at **build time** in export mode; **no server actions** in shared pages.
- Catalog data: **web** = server-render from Neon (serverless driver) for SEO; **Capacitor** = client-fetch from the Lambda catalog API (`K-3`).
- Pin **Next.js version** against **OpenNext** adapter support (Next 16 in 2026 — verify before wiring).

## Open questions

- Next.js ↔ OpenNext version pinning at build time.
- Player fork → Next app migration sequencing (catalog ships first regardless).
- Whether/when to split a lean SEO-only marketing app (F-2) — defer.

## Sources

- `/ce-sessions` synthesis 2026-06-16 (sessions: `serene-grothendieck-fb5e67`, `pensive-boyd-6d17e3`, `distracted-payne-ffafa7`, `friendly-murdock-956092`, `gracious-darwin-12d19e`).
- `design-stack.md`, `feature-freeze.md` (H-4 host, I-3 Capacitor), `aws-learning-map.md`, `decision-registry.md`.
- AWS Free Tier (Jul-2025 model) + Always-Free; AWS Amplify pricing; OpenNext (Next.js → Lambda + CloudFront); Next.js `output: 'export'` docs.
