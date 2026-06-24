# Phase 1 handoff — thin deployable AWS slice (About-page hello-world end-to-end)

> Draft 2026-06-21. The recruiter-clickable artifact, early — per ADR
> `docs/decisions/2026-06-17-architecture-decisions.md` §11 Phase 1, after Phase 0
> (NH-195, delivered by PR #56). Jira vehicle: **NH-206** (Story under epic NH-176).

## Goal

A **live, public URL** showing an **About page** served **end-to-end through AWS**:
**CloudFront → Lambda Function URL → Lambda** (the Lambda returns the About page / a
hello-world response). Recruiter-clickable. Honours the DACI 4-week-pivot guardrail
(ship something real, early). Stays inside the AWS $0 free-tier posture.

## What already exists (from #56, do NOT rebuild)

- `infra/lambda-with-url.stack.ts` — a Pulumi `LambdaWithUrl` component (Lambda + Function
  URL). Currently inline `StringAsset` placeholder code; authType **NONE** (Phase-1 item:
  flip to **AWS_IAM** or front with CloudFront + OAC, per the security review).
- `client/` — Vite + TanStack Router SPA skeleton (a route can become the About page).
- `server/` — NestJS skeleton (hexagon folders). serverless-express handler is a DEFERRED
  integration — decide in this phase whether the slice serves the Nest app or stays a
  static About page (simplest first).

## Slice shape — DECIDED (Leo, 2026-06-21): option (c)

**(c) serverless-express running the Nest `server/` app on the existing `LambdaWithUrl`.**
The About page is the **first route of the real app**, not a throwaway. Rationale: the end
goal is a full authenticated CMS running on AWS — that IS the Nest-on-Lambda shape, so build
it upfront and let Phase 2 (CMS CRUD) add routes to the same deployed thing. (a) static and
(b) tiny-handler were rejected as throwaway. Trade-off accepted: a bit more first-deploy
wiring (serverless-express + Nest-on-Lambda bundling, done once) in exchange for zero rebuild.
NOTE: serverless-express is a deferred integration — wiring it is part of this phase.

## Suggested order (Leo normally reviews at each decision, but he is AFK, so unless you are really unsure, try use best judgment to no refactors in the feature. Forget about YAGNI if matches our endgoal.)

**CRITICAL:** use small commits that are easy to cherry-pick later. fine if you want to use multiple branches, but preferable single PR.

1. **Wire serverless-express** so the Nest `server/` app runs inside `LambdaWithUrl`
   (esbuild bundle the Nest app → swap the stack's inline `StringAsset` for the real bundle).
   oRPC packages are ESM-only — bundle them in, do NOT mark `--external` (ADR / learnings note).
2. **Decide the auth/exposure** for the Function URL: authType NONE behind CloudFront OAC,
   vs AWS_IAM. (Security review flagged NONE + wildcard CORS as the Phase-1 lockdown.)
3. **Build the About page** as a route served by the Nest app (minimal real content).
4. **Pulumi:** extend the stack with CloudFront (+ OAC/cache policy); wire the About page
   as the origin/handler. `pnpm --filter @notation-hero/infra run pulumi:preview` then `up`.
5. **Verify** the public CloudFront URL serves the About page; capture the URL.
6. **Update** decision-registry (enforcement/infra change) + the relevant spike/ADR refs;
   move the Jira ticket through CODE → done; note the live URL.

## Rules (same as NH-199)

- Work in a dedicated worktree; never touch the primary checkout / master.
- Baby commits at green checkpoints; never `--no-verify`.
- AWS: IAM Identity Center daily-driver; zero-spend budget; free-tier posture (no Route53
  paid zone / no NAT without flagging). Pulumi token + AWS creds are local-only (never CI).
- Follow Leo's AskUserQuestion conventions from ~/.claude/adhd-collaboration-rules.md (pickers for decisions at the end).
- Re-confirm 2026-time-sensitive infra facts (CloudFront free-tier limits, Function URL +
  CloudFront OAC support) before building.

## Decisions (locked)

- **Jira vehicle:** NH-206 (Story under epic NH-176).
- **Slice shape: (c)** — serverless-express running the Nest `server/` app on `LambdaWithUrl`
  (Leo, 2026-06-21; build the real app upfront, no throwaway).

## Open decisions for Leo (resolve early in the phase)

- **Function-URL auth/exposure:** NONE behind CloudFront OAC vs AWS_IAM (step 2).
- **About content:** a Nest-rendered HTML route, vs the Nest app serving the built `client/`
  SPA's static assets (the SPA route becomes the About page). Brainstorm before building.

---

## Agent resolutions (2026-06-21, AFK best-judgment — flagged for Leo's review)

Resolved the two open decisions per Leo's free-tier-first + endgame steer (`/lfg` run, Leo AFK):

- **Function-URL auth → AWS_IAM + CloudFront OAC** (ADR ARCH-LAMBDA-1). The raw `*.lambda-url`
  becomes unreachable; all traffic flows through CloudFront. OAC-for-Function-URLs is GA.
- **About content → ARCH-EDGE-1 two-origin** (a _third_ option beyond the two above, chosen
  for the stated #1 priority: free-tier). One CloudFront distribution, two origins:
  - `/*` → **S3** (built `client/` SPA static assets, OAC, long edge-cache) — the About page
    is a real SPA route, served from the edge so S3/Lambda are not hit on reads.
  - `/api/*` → **Nest lambdalith** Function URL (AWS_IAM + OAC, short/no cache) — slice (c).
  - The SPA About route calls `/api/catalog` (first real feature, placeholder data) to prove the Lambda leg end-to-end live. (Updated post-review: the throwaway `/api/about` was replaced with a real endpoint per leocaseiro.)
  - **Why over single-origin lambdalith:** serving static assets from Lambda invokes the
    function on every cache-miss (more invocations + GB-seconds) — the opposite of the
    free-tier goal. S3+edge-cache is strictly cheaper and is Leo's own ADR (ARCH-EDGE-1).
  - This is the zero-refactor CMS foundation: Phase 2 = more SPA routes + more Nest routes
    - Cognito on the same deployed two-origin distribution.

**Out of this PR** (foundation accommodates; each is its own ticket): Dexie data-caching,
Cognito sign-in, Sentry, SRE/alerting, the CMS CRUD itself.
