# Clean-slate infra + tooling + app-skeleton spike — consolidated stack recommendations

- **Ticket:** NH-199 · **Date:** 2026-06-19 · **Branch:** `nh-clean-slate-spike`
- **Method:** 7 parallel research agents, each read the §8 prior-art docs (INPUT, not re-derived) then verified every fast-moving fact against **current 2026 official sources** (npm registry, AWS pricing pages, GitHub release dates). No training assumptions. All version numbers verified 2026-06-19.
- **Prompt:** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/nh-clean-slate-spike/docs/prompts/2026-06-19-clean-slate-infra-tooling-app-skeleton-spike.md`

## 0. How to read this

Per area (§2–§7): **Recommendation → one-line Why → concrete command/config → `$0` note.** The eight §9 open spikes are resolved inline and summarised in the table below. Genuine "needs-Leo" choices are collected in **§Open decisions (≤7)** at the end; plan-time checks (not decisions) are in **§Phase-1 must-verify**.

**Tiebreaker on everything: AWS `$0` at hobby scale.** **Anchor: tooling conforms to `nest g` — zero churn on generated files.**

---

## §9 open spikes — resolved (at a glance)

| #   | Spike            | Decision                                                                                       | One-line why                                                                                                                   | `$0`                                               |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 9.1 | IaC              | **Pulumi (TypeScript)**                                                                        | TS-native, direct-SDK AWS-learning, already wired in `infra/`                                                                  | local backend or free Individual Pulumi Cloud = $0 |
| 9.2 | Lambda packaging | `**@codegenie/serverless-express` v5 + esbuild**                                               | only adapter declaring `node>=24`, active fork of archived vendia                                                              | free                                               |
| 9.3 | ORM              | **Drizzle + drizzle-zod + `@neondatabase/serverless` (neon-http)**                             | only option that is Neon-HTTP-native **and** SWC-clean (no decorators)                                                         | MIT + Neon free tier                               |
| 9.4 | Analytics        | **GA4 for v1** *(ratified 2026-06-19)*                                                         | unblocks v1, simplest; ⚠️ ~99% adblocked → undercounts. Post-v1 revisit: PostHog vs Amplitude vs Statsig vs server-side Athena | free                                               |
| 9.5 | Linter/formatter | **NEW spike: NestJS-default-first (Biome-free)** *(ratified 2026-06-19)*                       | prior Biome-vs-ESLint analysis dropped; fresh spike under NH-42                                                                | OSS                                                |
| 9.6 | Monorepo         | **plain pnpm workspaces (`pnpm -r`)**                                                          | 4 packages, 1 dep edge → Turborepo cache saves ~5–10 s for real config cost                                                    | free                                               |
| 9.7 | State            | **TanStack Store** now; **XState** for the gameplay loop later                                 | Store is a tiny reactive primitive that doesn't fight Query/offline                                                            | free                                               |
| 9.8 | iOS MIDI         | **v1 = "Web MIDI Browser" shim** (proven); fast-follow = **fork `capacitor-musetrainer-midi**` | shim already validated with AlphaTab on Leo's prototype; fork reuses the hard CoreMIDI/Swift part                              | free/MIT                                           |

---

## §2 Infrastructure (AWS, free-tier-first)

### Compute — Lambda + Function URL + CloudFront OAC

- **Rec:** Function URL with `authType: AWS_IAM`; CloudFront origin uses an **OAC of type `lambda**` (`signingBehavior: always`, `sigv4`) + origin-request policy `AllViewerExceptHostHeader`. (OAC-for-Function-URL is GA since 2024-04-11.)
- **Why:** locks the raw Lambda URL behind SigV4 so CloudFront/WAF can't be bypassed — with **no API Gateway cost**.
- **Config:** grant CloudFront invoke via `aws.lambda.Permission` (`action: lambda:InvokeFunctionUrl`, `principal: cloudfront.amazonaws.com`, `sourceArn: <distribution.arn>`). ⚠️ Non-GET requests need the client to send `x-amz-content-sha256` (body hash) — see Phase-1 must-verify.
- `**$0`:** Function URLs + OAC free; CloudFront 1 TB egress + 10 M req/mo **always-free** (the dominant cost vector past 1 TB ≈ $0.085/GB).

### Data — Neon + DynamoDB + Streams

- **Rec:** **Neon Postgres** (catalogue, `@neondatabase/serverless` HTTP driver) + **DynamoDB in PROVISIONED mode** (5 RCU/5 WCU, single-table `pk=USER#<sub>`) + **Streams** (`NEW_AND_OLD_IMAGES`) feeding a Lambda.
- **Why:** Neon is $0 standard Postgres+JSONB+tsvector with scale-to-zero; DynamoDB free tier exists **only** for provisioned mode; Stream→Lambda reads are free.
- `**$0`:** Neon 0.5 GB + 100–190 compute-hrs/mo permanent free. DynamoDB 25 GB + 25 WCU + 25 RCU always-free. ⚠️ on-demand mode has **no** free tier — lock provisioned before M1.

### Edge/hosting — S3 + CloudFront + ACM

- **Rec:** private S3 (Block-All-Public) + CloudFront OAC (type `s3`) + **ACM cert in `us-east-1**` (`*.notationhero.com` + apex), DNS-validated.
- **Config:** `aws acm request-certificate --region us-east-1 --domain-name notationhero.com --subject-alternative-names "*.notationhero.com" --validation-method DNS` → add the CNAME to Namecheap (keep it forever for auto-renewal).
- `**$0`:** ACM free with CloudFront; assets trivially within limits; **no Route 53 hosted zone** (saves ~$0.50/mo) — Namecheap free DNS handles ACM validation directly.

### Auth — Cognito + Google

- **Rec:** Cognito **Essentials** + **Managed Login v2** + Google social IdP via PKCE; **Google-only at v1** (sidesteps duplicate-account merging).
- **Why:** social Google counts in the **10 000 MAU always-free** bucket (not the 50-MAU SAML bucket); Hosted UI ships sign-up/in/out + verification with zero FE auth code.
- `**$0`:** $0 forever at admin/hobby scale; $0.015/MAU past 10 k.

### Messaging — SQS / SNS (EventBridge later)

- **Rec:** **SQS Standard** for async worker queues; **SNS** only when one event must fan out to several queues; **skip the EventBridge bus** at v1; use **EventBridge Scheduler** for cron.
- **Why:** SQS/SNS + Scheduler are always-free; the EventBridge **bus has no free tier** ($1/M events) — a needless cliff at v1.
- `**$0`:** SQS 1 M req/mo, SNS 1 M publishes/mo, EventBridge Scheduler 14 M invocations/mo — all always-free.

### Secrets — SSM Parameter Store + KMS

- **Rec:** SSM Parameter Store **Standard** (`SecureString`) using the **AWS-managed `aws/ssm` key** — do **not** create a customer-managed KMS key (CMK) at v1.
- **Why:** Standard SSM is free (10 k params); a CMK costs $1/mo with no free tier; `aws/ssm` is free.
- `**$0`:** SSM Standard free; AWS-managed key free; 20 k KMS calls/mo free.

### Observability — CloudWatch (Sentry for errors)

- **Rec:** CloudWatch Logs/Metrics at v1 with `**retentionInDays: 14**` on every Lambda log group; X-Ray/ADOT deferred to M1.
- **Why:** 5 GB ingest + 5 GB storage + 10 alarms + 3 dashboards always-free; **infinite retention is a silent cost cliff** — always set retention.
- **Error logging [MUST]:** **Sentry** Developer (free) — `@sentry/node` (server) + `@sentry/react` (client); `tracesSampleRate` low to protect the 5 k errors/mo quota.

### DNS — manual, free

- **Rec:** keep DNS at **Namecheap** (free); ACM CNAME validation; Route 53 only if alias/latency/failover is ever needed. Namecheap gotcha: enter only the host portion (it appends the domain), no trailing dot.

---

## §3 Backend — NestJS on Lambda, generators-first

### NestJS 11 + DDD/Hexagon + `nest g`

- **Rec:** scaffold into the hexagon with the **path argument**: `nest g resource modules/<name> --type rest --no-spec` → lands in `server/src/modules/<name>/`. Domain entities are hand-authored in `server/src/core/<domain>/` (discard the generated `entities/*.entity.ts` stub).
- **No-churn requires:** (1) create `server/.swcrc` (SWC reads this, **not** tsconfig transforms) with `legacyDecorator: true` + `decoratorMetadata: true` + `keepClassNames: true` — without it Nest DI silently breaks under `nest build --builder swc`; (2) formatter `lineWidth/printWidth: 100` (default 80 rewraps a generated import). `nest-cli.json` is already correct (`sourceRoot: src`, `builder: swc`).
- `**.swcrc` (create at `server/.swcrc`):**
  ```json
  { "jsc": { "parser": { "syntax": "typescript", "decorators": true },
      "transform": { "legacyDecorator": true, "decoratorMetadata": true },
      "keepClassNames": true, "target": "es2022" },
    "module": { "type": "commonjs" }, "sourceMaps": true }
  ```

### Lambda packaging (§9.2)

- **Rec:** `**@codegenie/serverless-express@5**` (declares `node>=24`, the maintained fork of the archived `@vendia/serverless-express`) + **esbuild** bundling the Nest Express app, cached singleton across invocations.
- **esbuild:** `esbuild server/src/entry/http.ts --bundle --format=cjs --platform=node --target=node24 --minify --keep-names --external:@aws-sdk/* --outfile=server/dist/entry/http.js` — ⚠️ do **not** `--external` the `@orpc/*` packages (ESM-only → must be bundled into the CJS artifact); `reflect-metadata` must be the first import and bundled.
- **Handler (cached singleton):**
  ```ts
  let cached: Handler;
  export const handler: Handler = async (e, c, cb) => {
    cached ??= serverlessExpress({ app: (await bootstrap()).getHttpAdapter().getInstance() });
    return cached(e, c, cb);
  };
  ```

### Typed contract — oRPC (confirmed over ts-rest)

- **Rec:** **oRPC `@orpc/*` 1.14.x** (weekly releases; ts-rest is frozen, last 3.52.1 in 2025). oRPC mounts **inside NestJS** via `@orpc/nest` (`@Implement(contract.x)` on generated controllers) — **not** the standalone `@orpc/standard-server-aws-lambda` (that's for non-Nest deployments; here Nest is "the door", serverless-express is the Lambda bridge). Contract lives in `shared/` and is imported by both client and server; client uses `@orpc/tanstack-query`.
- `**$0`:** pure TS inference, no codegen.

### Validation — Zod

- **Rec:** **pin Zod v4** (`^4.4.x`, current `latest`; drizzle-zod and oRPC-via-Standard-Schema both support it) *(ratified — validate during NH-42)*. Validate `@hookform/resolvers ≥ 3.10` + v4 error-shape/`.merge()` breaking changes when the tooling lands.

### Auth-in-Nest — guard + framework-free `can()`

- **Rec:** `aws-jwt-verify@5` `CognitoJwtVerifier` as a module-singleton guard (caches JWKS, no cold-start penalty) that attaches `{ sub, groups }`; a **framework-free `can(user, item, action)**` in `server/src/core/auth/` (zero `@nestjs/*` imports → the dependency-cruiser core-purity fence proves it).

### ORM (§9.3) — Drizzle

- **Rec:** `**drizzle-orm` + `drizzle-kit` + `drizzle-zod**` over the **neon-http** driver. Beats Prisma/TypeORM/Kysely because it is the only one that is **both** Neon-HTTP-native **and** SWC-clean (schema-as-TS, no decorators — TypeORM's decorator entities clash with SWC). `GENERATED` tsvector columns are authored in raw SQL and *referenced* (never owned) by Drizzle; `jsonb` is typed via `$type<T>()`.
- **Provider (`server/src/adapters/db/`):** `drizzle(neon(process.env.DATABASE_URL!), { schema })` behind a `DRIZZLE` injection token; `drizzle-zod` `createSelectSchema(...).omit({ createdBy:true })` derives the oRPC DTOs (drops PII).

---

## §4 Frontend — TanStack SPA (no SSR)

> The existing `client/` already has Vite 8 + React 19 + TanStack Router + Query + Tailwind v4 wired; the below extends that scaffold.

### Vite + React 19 + React Compiler

- **Rec:** React **19.2.x** (stable) + **React Compiler 1.0.x** (stable, no RC qualifier) via `@vitejs/plugin-react@6` + `@rolldown/plugin-babel` + `babel-plugin-react-compiler@1`; `eslint-plugin-react-compiler` (still RC — pin loosely, lint-only).
- **Config:** `react()` + `babel({ presets: [reactCompilerPreset()] })` in `vite.config.ts`; `build.sourcemap: true` (Sentry needs it). React Compiler is build-time → `**$0` runtime**.

### TanStack Router + Query (+ Form + Table)

- **Rec:** all stable on `latest` — Router 1.170.x, Query 5.101.x, Form 1.33.x, Table 8.21.x. Router file-based routing already wired via `@tanstack/router-plugin/vite`. Form/Table are headless hooks — `pnpm add` only, no providers.

### Shadcn + Tailwind v4 + tokens

- **Rec:** **Tailwind v4** (CSS-first `@theme {}`, `@tailwindcss/vite` — already the v4 entry in `styles.css`) + **shadcn 4.x** (`pnpm dlx shadcn@latest init -t vite`). Teal tokens in `@theme`: `--color-brand-400: #2dd4bf; --color-brand-700: #0f766e;` bridged to `--color-primary` for shadcn.

### Auth client — oidc-client-ts (in-memory)

- **Rec:** `**oidc-client-ts@3.5.x**`, Authorization Code + **PKCE** against Cognito Hosted UI, **tokens in an in-memory `Storage` (a `Map`)** — never localStorage/sessionStorage; `automaticSilentRenew` via `/auth/silent-renew` route. CSP `frame-src` must include the Cognito domain (roll out report-only first).

### AlphaTab [MUST]

- **Rec:** `**@coderline/alphatab@1.8.x**` (stable). Copy worker + SoundFont + Bravura font to static assets via `vite-plugin-static-copy`; `settings.core.workerFile`/`player.soundFont` point at them; `enablePlayer`/`enableCursor` on. Scoring loop binds to the player position event (verify exact event name against the pinned types). Lazy-chunk it (see Open decisions / NH-198). Served from S3/CloudFront → `$0`.

### Error + analytics

- **Rec:** `**@sentry/react@10**` (browser SDK — not the server `tanstackstart` pkg) + `@sentry/vite-plugin` for sourcemaps; analytics per §9.4 below.

### State (§9.7)

- **Rec:** start with `**@tanstack/react-store**` (tiny reactive primitive; owns client-only synchronous UI/session state; doesn't conflict with Query's server state or Dexie's durable queue). Add **XState** later, scoped to the **gameplay scoring state machine** (waiting → count-in → playing → paused → ended → summary) — it runs alongside Store, not instead of it.

---

## §5 Offline + mobile + MIDI seam

### Dexie + insert-only outbox + ULID [MUST]

- **Rec:** `**dexie@4` + `ulid@3` (`monotonicFactory`)** + a hand-rolled outbox (~150 LoC). No sync framework (RxDB rejected — paywall): inserts never conflict, so a framework adds protocol overhead for zero gain.
- **Schema:** three tables — `catalogCache` (curated read cache, server id), `outbox` (`++seq` auto-increment = drain order, `state` queued→inflight→done/rejected, grouped by `batchId`), `userContent` (client-ULID PK, survives re-sends via server `ON CONFLICT DO NOTHING`). Drain is idempotent, batched, FK-safe by `seq` order; terminal vs transient rejection split by reason.
- **Server prerequisite (P1):** idempotent `POST /sync/batch` (all-or-nothing, deferrable FKs, structured `{ok, rejected}`).

### Capacitor (iOS) + PWA fallback

- **Rec:** **Capacitor 6** + `**@capacitor/filesystem**` (write blobs to `Directory.Library` — survives WebKit IndexedDB/Cache eviction; **not** `Directory.Cache`). PWA and Capacitor share 100% of the TS source (the shell is a build-time wrapper). Android stays PWA-only at v1. Capacitor is MIT/free (store accounts have their own fees, unrelated).

### `MidiInputPort` hexagon seam [design now, build later]

- **Rec:** a `MidiInputPort` interface (`listDevices`, `onMessage`, `close`) with swappable adapters; **never call `navigator.requestMIDIAccess` directly.**
  - **WebMidiAdapter** (desktop Chrome/Edge + Android + the iOS shim): **enumerate with a manual `iter.next()` loop, never `Array.from(midiAccess.inputs.values())**` — the latter silently returns `[]` on the shim's engine (mizuhiki#11; WebMIDI.js v3.x uses the breaking form internally → don't use it on the shim). Scoring runs **in JS** off Web MIDI events (no bridge).
  - **NativeCoreMidiAdapter** (iOS, fast-follow) + optional **Android `android.media.midi**` (later): **scoring runs native-side** against a pre-loaded tick map; only `{noteId, verdict, ts}` verdict events cross the JS bridge (per-call bridge overhead is tens of ms — marshalling raw bytes blows the latency budget).
  - **Factory** picks the adapter at runtime (`isCapacitor() && isIos()` → native, else Web MIDI).
- **iOS install-nudge seam:** detect iOS + no `requestMIDIAccess` in the PWA → one-time dismissible banner to install the free "Web MIDI Browser" app (copy TBD; seam exists now).

### iOS MIDI path (§9.8)

- **v1 = the shim** — AlphaTab render + synth + Web MIDI scoring already validated on Leo's prototype (incl. a 2016 iPad mini); the manual `iter.next()` enumeration is what makes it work. Latency ~15–25 ms on old iPads (acceptable for casual v1; not the ~5–10 ms CoreMIDI floor).
- **Fast-follow = fork `capacitor-musetrainer-midi**` *(ratified as direction; scheduled AFTER NH-42 — not v1)* (MIT, but stale: v0.2.3 / Cap-4 / iOS+Web, no Android, last commit 2023) — **fork over custom** because the hard Swift/CoreMIDI wiring already exists; ~1–2 days to migrate to Cap 6, add the Android Kotlin bridge, and move scoring native-side. Keep it as a local workspace package. For v1, **MIDI PWA → Capacitor** stays architecture context only (the `MidiInputPort` seam covers it).
- **Hard rule:** smoke-test **any** new JS audio/timing lib on the iOS-shim WebView before depending on it (e.g. **Tone.js** for a future waterfall-view player is **untested** there; AlphaTab's own backing-track mode is the Tone-free fallback).

---

## §6 Cross-cutting — type-safety + linting + autofix

### Linter/formatter (§9.5) — NEW spike (ratified 2026-06-19)

- **Decision (Leo):** the linter is decided by a **NEW spike that starts from NestJS defaults (ESLint, Biome-free)**. The earlier "Biome-format + ESLint-lint" recommendation is **dropped**; the prior Biome-vs-ESLint spikes are **superseded** and must **not** be referenced by the new work — fresh evaluation. Tracked under [NH-42](https://leocaseiro.atlassian.net/browse/NH-42).
- **Question for the new spike:** does NestJS's default ESLint (flat-config) + generator formatting cover the needs (no-fight `nest g`, type-aware async rules, flawless autofix) with **no Biome at all**? If a formatter is still wanted, evaluate it fresh.
- **Locked, tool-independent (DI-safety):** whatever lints `server/` must NOT rewrite injected-service imports to `import type` (breaks Nest dependency injection). Structural rules still apply: `import-x/no-default-export`, `check-file` kebab-case + role-suffix, `eslint-comments/no-unlimited-disable`, `no-restricted-imports` banning `@nestjs/*`/`@aws-sdk/*`/`@pulumi/*` from `core/`.

### The rest

- **EditorConfig:** root `.editorconfig` — `lf`, final newline, 2-space; leave quote style to the formatter (TBD by the NH-42 linter spike).
- **Lefthook:** the existing `lefthook.yml` is sound; add the formatter step (tool TBD by the NH-42 linter spike) as pre-commit step 0; keep layout-guard / gitleaks / semgrep / lint+typecheck; `pre-push` runs lint+typecheck+test. (Lefthook 2.1.9 pinned — fixes the worktree shim bug.)
- **commitlint:** existing `commitlint.config.cjs` (`config-conventional` + `body-max-line-length: [1,'always',200]`) — keep as-is.
- **TypeScript strict:** `tsconfig.base.json` already `strict`; **add `noUncheckedIndexedAccess: true**` (highest-signal) and `exactOptionalPropertyTypes: true`. Defer `isolatedDeclarations` (that's the NH-42 public-API work). Server `tsconfig.json` keeps Nest's `noImplicitAny:false` scaffold default for now.
- **dependency-cruiser:** the existing fail-closed `core-purity` allow-rule is correct; add a named `no-core-to-pulumi` rule for symmetry with the ESLint ban. `pnpm exec depcruise server shared infra`.
- **Dep health:** **Knip** (extend `knip.json` to cover root + client + infra workspaces, not just server), **Syncpack** (`versionGroups` pinning `typescript`/`@types/node` identical across packages), **Renovate** *(ratified)* — grouped updates avoid Dependabot's 50+ `chore(deps): bump` PRs/day; flip to Dependabot only if the repo goes private.
- **Security (CI):** **gitleaks** (`gitleaks detect --no-banner --exit-code 1` — CLI form avoids the action's private-repo license gate), **semgrep** (`--config auto`), **osv-scanner** (`google/osv-scanner-action@v2` reads the existing `osv-scanner.toml`). All free for this use.
- **Package manager / monorepo (§9.6):** **pnpm workspaces**, orchestrated by plain `pnpm -r --if-present run <target>` (already in root `package.json`) — **no Turborepo** (flip when packages > ~8 or server build > ~30 s).

---

## §7 Testing + CI/CD

- **Server tests:** **Vitest** *(ratified 2026-06-19 — flip from Jest)* — unifies client+server on one runner. NestJS officially supports it via the [SWC + Vitest recipe](https://docs.nestjs.com/recipes/swc#vitest) (small setup: a `vitest.config.ts` with `globals: true` + the `unplugin-swc` plugin; `nest g`'s Jest-style specs run unchanged under Vitest globals).
- **Client tests:** **Vitest 4** + (nice-to-have) React Testing Library — shares Vite's transform pipeline; TanStack Query has Vitest-friendly test utils.
- **E2E:** **Playwright 1.61** with `trace: 'on-first-retry'` + `screenshot: 'only-on-failure'`; upload `test-results/` as a CI artifact `if: always()` (NH-197). Artifacts free ≤ 500 MB/mo.
- **Visual regression:** **Playwright `toHaveScreenshot()**` (free, baselines in git) over **Chromatic** — Chromatic's 5 000-snapshot/mo free cap (story × viewport × browser) is blown in days by a solo dev's push rate, then gates CI (~$149/mo). See Open decisions.
- **Storybook 10** — `@storybook/react-vite`, import the Tailwind CSS entry in `preview.ts`.
- **CI — GitHub Actions + OIDC-to-AWS:** **no long-lived keys** — `aws-actions/configure-aws-credentials@v6` with `permissions: id-token: write` assuming a role scoped to `repo:leocaseiro/notation-hero:ref:refs/heads/master`. Lint+typecheck via `pnpm -r`. Pulumi `up` runs from CI under that role (or locally per the existing AGENTS note).
- **size-limit:** `@size-limit/preset-app@12` — JS budget `200 kB`, CSS `20 kB` in `client/package.json`; CI `size` step after build (raise once AlphaTab is profiled — lazy-chunk it).
- **Later (mention, don't build):** LocalStack (M1, when DynamoDB lands), coverage-ratchet, Stryker (v1.5 on the `core/` scoring engine).
- **Perf (NH-198):** route code-splitting + lazy-load AlphaTab/player + the size-limit budgets above.

---

## Reconciled cross-cutting calls (where the research tracks differed)

1. **Lambda entry = serverless-express, oRPC mounts inside Nest.** The backend track showed both a Nest-hosted (`@orpc/nest`) path and a standalone `@orpc/standard-server-aws-lambda` handler. They're mutually exclusive — we keep **NestJS as the door** (ADR-locked), so the handler is **serverless-express wrapping the Nest Express instance**, with oRPC mounted *inside* Nest via `@orpc/nest`. The standalone oRPC-Lambda adapter is not used.
2. **Server test runner = Vitest** *(Leo ratified 2026-06-19)*. The tracks proposed Jest; Leo flipped to Vitest per the NestJS SWC + Vitest recipe — small setup, unifies client+server (the ADR already had Vitest as the intended direction). `nest g`'s Jest-style specs run unchanged under Vitest's `globals: true`.
3. **One `.swcrc`, two consumers.** `nest build --builder swc` (bundle) and `@swc/jest` (test) read the **same** `server/.swcrc` — don't duplicate decorator-metadata config.

---

## Decisions — ratified by Leo 2026-06-19

All 7 reviewed and decided. (D1 / D6 / D7 carry follow-up conditions.)

1. **Linter (§9.5) → NEW spike, NestJS-default-first (Biome-free).** Prior "Biome-format + ESLint-lint" rec dropped; the earlier Biome-vs-ESLint spikes are **superseded** and must not be referenced by the new work. Tracked under [NH-42](https://leocaseiro.atlassian.net/browse/NH-42). DI-safety constraint stays (no `import type` on injected services).
2. **Analytics (§9.4) → GA4 for v1** (simplest, unblocks). ⚠️ Acknowledged: GA4 is ~99% adblocked → undercounts. **Follow-up (post-v1): revisit PostHog vs Amplitude vs Statsig vs server-side CloudFront-logs→Athena** (Athena is adblock-proof — server-side).
3. **Server tests → Vitest** (flip from Jest). Per the NestJS [SWC + Vitest recipe](https://docs.nestjs.com/recipes/swc#vitest) — small setup, unifies client+server on one runner.
4. **Dependency bot → Renovate** (already agreed). Grouping avoids Dependabot's 50+ `chore(deps): bump` PRs/day; flip to Dependabot only if the repo goes private.
5. **Visual regression → Playwright snapshots.** Chromatic is a nice-to-have later only.
6. **Zod → v4** — ratified, **validate during NH-42** (`@hookform/resolvers ≥ 3.10`; v4 error-shape / `.merge()` breaking changes).
7. **iOS native-MIDI → fork `capacitor-musetrainer-midi**` — accepted as direction, **after NH-42** (not now). For v1, keep **MIDI PWA → Capacitor** as architecture context only (the `MidiInputPort` seam in §5 covers it).

**Net-new follow-ups to track:** (a) **NH-42** = the new NestJS-default-first linter spike (D1); (b) a post-v1 **"analytics revisit"** ticket (D2 — PostHog / Amplitude / Statsig / Athena).

---

## Phase-1 must-verify (checks, not decisions)

- **OAC body hash:** send `x-amz-content-sha256` on POST/PUT through CloudFront→Function URL — confirm the oRPC client / serverless-express path sets it (test in the hello-world before the auth gate).
- **Function URL authType:** flip `infra/` Function URL from `NONE` → `AWS_IAM` + add the CloudFront-OAC `aws.lambda.Permission` before any real data ships.
- `**nest g` clean pass:** confirm `nest g resource modules/<x>` output passes `biome format` + ESLint with zero churn at lineWidth 100.
- **AlphaTab bundle:** lazy-chunk AlphaTab and re-tune the 200 kB size-limit budget when it's wired (NH-198).
- **CSP hosts:** add Cognito (frame-src) + the analytics host (GA4 → `www.googletagmanager.com` / `www.google-analytics.com` in script-src/connect-src; PostHog host if revisited) when wired; roll CSP out report-only first.
- **Tone.js on shim:** if a future waterfall-view player needs Tone.js, smoke-test it on the "Web MIDI Browser" WebView on a real old iPad first.

---

## Version pins (verified 2026-06-19)

| Area      | Package                                                                                  | Pin                                          |
| --------- | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| IaC       | `@pulumi/pulumi` / `@pulumi/aws`                                                         | `^3.247` / `^7.34`                           |
| Lambda    | `@codegenie/serverless-express` / `esbuild`                                              | `^5.0` / `^0.28`                             |
| Backend   | NestJS / `@orpc/*` / `zod` / `aws-jwt-verify`                                            | `11` / `^1.14` / `^4.4` / `^5.2`             |
| ORM       | `drizzle-orm` / `drizzle-kit` / `drizzle-zod` / `@neondatabase/serverless`               | `^0.45` / `^0.31` / `^0.8` / `^1.1`          |
| Frontend  | `react` / `react-compiler` / `@vitejs/plugin-react`                                      | `19.2` / `1.0` / `^6.0`                      |
| TanStack  | router / query / form / table / store                                                    | `1.170` / `5.101` / `1.33` / `8.21` / `0.11` |
| UI        | `tailwindcss` / `shadcn` / `oidc-client-ts` / `@coderline/alphatab`                      | `^4.3` / `4.x` / `^3.5` / `^1.8`             |
| Offline   | `dexie` / `ulid` / `@capacitor/core`                                                     | `^4.4` / `^3.0` / `^6`                       |
| Lint      | `biome` / `typescript-eslint` / `dependency-cruiser`                                     | `2.5` / latest / `16.x`                      |
| Test/CI   | `vitest` / `@playwright/test` / `storybook` / `configure-aws-credentials` / `size-limit` | `^4.1` / `1.61` / `10.4` / `v6` / `^12`      |
| Analytics | `posthog-js`                                                                             | latest                                       |

## Sources

Per-area primary sources are in each research track's output and the §8 prior-art docs under `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/nh-clean-slate-spike/docs/spikes/` and `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/nh-clean-slate-spike/docs/decisions/`. AWS free-tier claims verified against the relevant `aws.amazon.com/<service>/pricing` pages; npm versions against the registry; library maintenance against GitHub release dates — all 2026-06-19.
