# Clean-slate infra + tooling + app-skeleton spike — consolidated stack recommendations (fresh redo)

- **Ticket:** NH-199 (fresh independent redo) · **Date:** 2026-06-20 · **Branch:** `worktree-nh-199-clean-slate-redo`
- **Method:** 7 parallel **independent** research agents. Each read the §8 prior-art docs as INPUT (not re-derived), then verified every fast-moving fact against **current 2026 official sources** today (npm registry, GitHub release dates, AWS pricing pages). No training assumptions; neutral searches. The result was cross-checked against the prior consolidated doc in the `nh-clean-slate-spike` worktree — agreements and divergences are flagged.
- **Base:** `origin/master` (8a31aec, the NH-194 architecture-decisions merge). Local `master` is 15 commits behind origin (stale, not diverged).

## 0. How to read this

Per area (§2–§7): **Rec → one-line Why → concrete Cmd/config → `$0` note.** The eight §9 open spikes are resolved inline and summarised in the table below. Genuine "needs-Leo" choices are in **§Open decisions (≤7)**; plan-time checks (not decisions) are in **§Phase-1 must-verify**.

**Tiebreaker on everything: AWS `$0` at hobby scale.** **Anchor: tooling conforms to `nest g` — zero churn on generated files.**

### Leo's decisions (ratified 2026-06-20, this pass)

1. **Analytics → GA4 for v1** (kept his prior call — simplest, unblocks; post-v1 revisit → PostHog/Athena). _Fresh research recommended PostHog+Athena; Leo reaffirmed GA4 for v1._
2. **Server tests → Vitest** (resolved the Jest↔Vitest contradiction toward Vitest — one runner, matches the prior D3 ratification).
3. **Linter NH-42 → closed.** This pass IS the NestJS-default-first spike: **ESLint flat-config + typescript-eslint + Prettier, NO Biome.**
4. **Repo = lightweight pnpm-workspaces monorepo** (`client` / `server` / `shared` / `infra`), **no Nx, no Turborepo**.

---

## §9 open spikes — resolved (at a glance)

| #   | Spike            | Decision                                                                                       | One-line why                                                                                       | `$0`                                                  |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 9.1 | IaC              | **Pulumi (TypeScript)**                                                                        | TS-native, direct AWS-SDK learning, already wired in `infra/`                                      | Pulumi Cloud **Individual** free / local backend = $0 |
| 9.2 | Lambda packaging | **`@codegenie/serverless-express`@5 + esbuild** (cached singleton)                             | only adapter declaring `node>=24`; maintained fork of archived `@vendia`                           | free                                                  |
| 9.3 | ORM              | **Drizzle + drizzle-zod + `@neondatabase/serverless` (neon-http)**                             | only option that is Neon-HTTP-native **and** SWC-clean (no decorators)                             | MIT + Neon free tier                                  |
| 9.4 | Analytics        | **GA4 for v1** _(Leo, 2026-06-20)_                                                             | simplest, unblocks v1; ⚠️ 15–50% adblock undercount on a dev-skewed audience → post-v1 revisit     | free                                                  |
| 9.5 | Linter/formatter | **ESLint flat + typescript-eslint + Prettier; NO Biome** _(NH-42 closed)_                      | NestJS-11 default; Biome `useImportType` autofix breaks Nest DI; only ESLint does type-aware rules | OSS                                                   |
| 9.6 | Monorepo         | **plain pnpm workspaces (`pnpm -r`)**                                                          | 4 packages / 1 edge → Turborepo cache saves seconds for real config-correctness cost               | free                                                  |
| 9.7 | State            | **TanStack Store** now; **XState** for the gameplay loop later                                 | Store is a tiny reactive primitive that doesn't fight Query/offline                                | free                                                  |
| 9.8 | iOS MIDI         | **v1 = "Web MIDI Browser" shim** (proven); fast-follow = **fork `capacitor-musetrainer-midi`** | shim already validated with AlphaTab on Leo's prototype; fork reuses the CoreMIDI/Swift part       | free/MIT                                              |

---

## §2 Infrastructure (AWS, free-tier-first) — region ap-southeast-2

### Compute — Lambda + Function URL + CloudFront OAC

- **Rec:** Lambda **arm64** + Function URL `AuthType=AWS_IAM`; CloudFront origin uses an **OAC of `type=lambda`** (`SigningBehavior=always`, `sigv4`) + managed origin-request policy `AllViewerExceptHostHeader` (ID **`b689b0a8-53d0-40ab-baf2-68738e2966ac`** — use the ID in IaC). Grant CloudFront **both** `lambda:InvokeFunctionUrl` **and** `lambda:InvokeFunction` (AWS's documented setup grants both), scoped via `sourceArn` to the one distribution.
- **Why:** locks the raw Lambda URL behind SigV4 (CloudFront/WAF can't be bypassed) with **no API Gateway cost**; arm64 is ~20% cheaper duration, same free tier, no code change.
- **⚠️ Body-hash gotcha:** every POST/PUT/DELETE-with-body from the SPA must send `x-amz-content-sha256` (hex SHA-256 of the exact body; empty = `e3b0c442...`). Add a fetch request interceptor (Web Crypto) + allow the header in CORS preflight, or CloudFront's SigV4 signature mismatches and Lambda **rejects** the call (not a silent pass). See Phase-1 must-verify.
- `**$0`:** Lambda **1M req + 400k GB-s/mo always-free**; Function URL free (no API Gateway); CloudFront **1 TB egress + 10M req/mo always-free**. Cliff: past 1 TB ≈ $0.114/GB (AU/NZ) — unreachable at hobby scale. **Stay on CloudFront pay-as-you-go — do NOT opt into the new (Nov 2025) "flat-rate plans" (Free plan = only 100 GB, far less than the always-free 1 TB).\*\*

### Data — Neon + DynamoDB (provisioned) + Streams

- **Rec:** **Neon Postgres** (`@neondatabase/serverless` HTTP driver) for the catalog + **DynamoDB in PROVISIONED mode** (25 RCU / 25 WCU, single-table `pk=USER#<sub>`) for per-user data + **Streams** (`NEW_AND_OLD_IMAGES`) → Lambda for the sync feed. (No table provisioned at v1 — lands at M1 as an additive adapter.)
- **Why:** Neon is $0 Postgres+JSONB+tsvector with scale-to-zero and no TCP pool to warm on Lambda; the DynamoDB free tier exists **only** for provisioned mode; Stream→Lambda reads are free.
- `**$0`:** Neon 0.5 GB + ~190 compute-hrs/mo permanent free. DynamoDB **25 GB + 25 WCU + 25 RCU always-free, provisioned-only** (on-demand bills from request #1). Streams: first 2.5M reads/mo free. ⚠️ Over-provisioned throughput **throttles, doesn't bill**; **GSIs share the same 25/25 pool\*\* — budget base table + all GSIs ≤ 25/25 (M1 concern).

### Edge/hosting — S3 + CloudFront + ACM

- **Rec:** private S3 (Block-All-Public, Bucket-owner-enforced) + CloudFront OAC (`type=s3`) + **one ACM cert in `us-east-1`** covering apex `notationhero.com` + `*.notationhero.com`, DNS-validated.
- **Cmd:** `aws acm request-certificate --region us-east-1 --domain-name notationhero.com --subject-alternative-names "*.notationhero.com" --validation-method DNS` → add the CNAME to Namecheap (keep it forever for auto-renewal). S3 bucket policy grants only `cloudfront.amazonaws.com` `s3:GetObject` with `Condition AWS:SourceArn = <distribution ARN>`.
- `**$0`:** ACM free with CloudFront; assets trivially within limits; **no Route 53 hosted zone\*\* (saves ~$0.50/mo) — wildcard does NOT cover the bare apex, which is why both names are on the cert.

### Auth — Cognito + Google

- **Rec:** Cognito **Essentials** + **Managed Login v2** + Google social IdP via **PKCE** (`code` flow, S256); **Google-only at v1**. Redirect URI `https://<domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse`.
- **Why:** social Google counts in the **10,000 MAU always-free** bucket (NOT the 50-MAU SAML/OIDC bucket); Managed Login ships sign-up/in/out + verification with zero FE auth code.
- `**$0`:\** $0 forever at admin/hobby scale; $0.015/MAU past 10k. ⚠️ adding any SAML/external-OIDC IdP later moves *those\* users to the 50-MAU bucket; prefer TOTP/passkeys over SMS-MFA (SMS = SNS charge).

### Messaging — SQS / SNS; EventBridge **Scheduler** (not a custom bus)

- **Rec:** **SQS Standard** for async worker queues; **SNS** for fan-out (SNS→SQS→Lambda); **EventBridge Scheduler** for cron. **Do NOT create a custom EventBridge bus at v1.**
- **Why:** SQS (1M req/mo) + SNS (1M publishes/mo) + delivery + Scheduler (14M invocations/mo) are all always-free; a **custom EventBridge bus has NO free tier ($1/M events from event #1)**.
- `**$0`:\*\* as above. SMS is never free.

### Secrets — SSM Parameter Store + KMS

- **Rec:** SSM Parameter Store **Standard** `SecureString` with the **AWS-managed `alias/aws/ssm` key** — do **not** create a customer-managed KMS key (CMK) at v1.
- **Cmd:** `aws ssm put-parameter --name "/notation-hero/google-oauth/client-secret" --type SecureString --key-id alias/aws/ssm --tier Standard --value "<secret>"`; grant the Lambda role `ssm:GetParameter` + `kms:Decrypt` on `aws/ssm`.
- `**$0`:\*\* SSM Standard free (10k params); `aws/ssm` key free; 20k KMS calls/mo free. A CMK = $1/mo (avoid); Secrets Manager = $0.40/secret/mo (rejected).

### Observability — CloudWatch (+ Sentry for errors)

- **Rec:** CloudWatch Logs/Metrics/Alarms at v1, with **`retentionInDays: 14` on every Lambda log group** (create the group in IaC _before_ the function so AWS doesn't auto-make an infinite-retention one). X-Ray/ADOT deferred to M1. **Error logging [MUST]:** Sentry Developer (free) — `@sentry/node` (server) + `@sentry/react` (client), low `tracesSampleRate`.
- **Why:** CloudWatch free tier (5 GB logs, 10 alarms, 3 dashboards, 10 custom metrics) is ample; **infinite retention is a silent cost cliff — always set retention.** Keep ~4 alarms incl. a billing alarm (`EstimatedCharges`) as a cost circuit-breaker.
- `**$0`:\*\* CloudWatch always-free as above; Sentry free = 5k errors + 50 replays + 5M spans/mo, 30-day retention, 1 user. Cliff: CloudWatch logs past 5 GB ≈ $0.50/GB (verbose logging is what blows it); Sentry Team $26/mo for a 2nd seat.

### DNS — manual, free

- **Rec:** keep DNS at **Namecheap BasicDNS** (free): ACM validation CNAME + `www CNAME → CloudFront` + apex via Namecheap **ALIAS** (or apex→www URL Redirect). Route 53 only if alias/latency/failover is ever needed.
- **Namecheap gotcha:** Host = the sub-label only (it appends the domain), no trailing dot; leading underscore is accepted.
- `**$0`:\*\* Namecheap free; ACM validates against external DNS; Route 53 zone = $0.50/mo (avoided).

---

## §3 Backend — NestJS on Lambda, generators-first

### NestJS 11 + DDD/Hexagon + `nest g`

- **Rec:** scaffold into the hexagon with the path argument: `nest g resource modules/<name> --type rest --no-spec` → lands in `server/src/modules/<name>/`. Hand-author domain entities in `server/src/core/<domain>/` (discard the generated `entities/*.entity.ts` stub).
- **No-churn requires:** (1) a **complete** `server/.swcrc` (the official Nest recipe's published version is INCOMPLETE — it omits the decorator-metadata transform → DI silently resolves `undefined`); (2) formatter `printWidth: 100` (default 80 rewraps a generated `nest g resource` import on first save). `nest-cli.json` → `builder: "swc"`, `typeCheck: true`.
- `**server/.swcrc`\*\* (hand-authored, the safe version):
  ```json
  {
    "$schema": "https://swc.rs/schema.json",
    "sourceMaps": true,
    "jsc": {
      "target": "es2022",
      "parser": {
        "syntax": "typescript",
        "decorators": true,
        "dynamicImport": true
      },
      "transform": { "legacyDecorator": true, "decoratorMetadata": true },
      "keepClassNames": true,
      "baseUrl": "./"
    },
    "module": { "type": "commonjs" },
    "minify": false
  }
  ```

### Lambda packaging (§9.2)

- **Rec:** `**@codegenie/serverless-express@5.0.0`** (declares `node>=24`; maintained fork of the archived `@vendia/serverless-express`) + **`esbuild@0.28.1`\*\* bundling the Nest Express app, cached as a module-scope singleton across invocations.
- **esbuild:** `esbuild server/src/entry/http.ts --bundle --format=cjs --platform=node --target=node24 --minify --keep-names --external:@aws-sdk/* --outfile=server/dist/http/index.js` — ⚠️ do **NOT** `--external` `@orpc/*` (ESM-only → must be bundled into the CJS artifact); `reflect-metadata` must be the first import.
- **Handler (cached singleton):**
  ```ts
  import "reflect-metadata"; // FIRST import
  import { NestFactory } from "@nestjs/core";
  import serverlessExpress from "@codegenie/serverless-express";
  import type { Handler } from "aws-lambda";
  import { AppModule } from "../app.module";
  let cached: Handler;
  export const handler: Handler = async (e, c, cb) => {
    cached ??= serverlessExpress({
      app: (await NestFactory.create(AppModule)).getHttpAdapter().getInstance(),
    });
    return cached(e, c, cb);
  };
  ```
- `**$0`:\*\* Lambda free tier covers hobby scale; arm64 cheapest; Function URL free.

### Typed contract — oRPC (confirmed over ts-rest)

- **Rec:** `**@orpc/*@1.14.6`** (`contract` + `server` + `nest` in `server`/`shared`; `client` + `tanstack-query` in `client`). ts-rest is frozen (`@ts-rest/core@3.52.1`, last activity mid-2025). Mount **inside NestJS\*\* via `@orpc/nest` (`@Implement(contract.x)` on controllers) — NOT the standalone `@orpc/standard-server-aws-lambda` (Nest is "the door", serverless-express is the bridge). Contract lives in `shared/`; `.route()` MUST declare `path` (required by `@orpc/nest`).
- `**$0`:\*\* pure TS inference, ~3.4 KB gz client, no codegen.

### Validation — Zod v4

- **Rec:** `**zod@4.4.3`**. Verified compat: `drizzle-zod@0.8.3` peers `zod ^3.25 || ^4`; `@hookform/resolvers@5.4.0`; oRPC via `@standard-schema/spec` (zod 4 implements Standard Schema **natively → no adapter\*\*). Import the bare `zod` (v4 is the default export).

### Auth-in-Nest — guard + framework-free `can()`

- **Rec:** `**aws-jwt-verify@5.2.1`** `CognitoJwtVerifier` built **once at module scope** (caches JWKS, no cold-start hit), attaching `{ sub, groups }`; a **framework-free `can(user, item, action)`** in `server/src/core/auth/` with **zero `@nestjs/*` imports\*\* (the dependency-cruiser core-purity fence proves it). `tokenUse: 'access'`.

### ORM (§9.3) — Drizzle

- **Rec:** `**drizzle-orm@0.45.2` + `drizzle-kit@0.31.10` + `drizzle-zod@0.8.3`** over the **neon-http** driver (`@neondatabase/serverless@1.1.0`). Only option that is **both** Neon-HTTP-native **and\*\* SWC-clean (schema-as-TS, no decorators — TypeORM's decorators clash with SWC).
- **Provider** (`server/src/adapters/db/`): `drizzle({ client: neon(process.env.DATABASE_URL!), schema })` behind a `DRIZZLE` injection token. `jsonb` typed via `$type<T>()`; `drizzle-zod` `createSelectSchema(...).omit({ createdBy: true })` derives the oRPC DTOs (drops PII).
- **tsvector (refined):** keep the `GENERATED` tsvector column **out of the TS schema** and own it + its GIN index in a hand-written `.sql` migration (raw DDL = truth; avoids drizzle-kit diff churn once the expression is weighted/multi-column). Reference it only in raw `sql` search queries.
- **Migrations:** `drizzle-kit generate` + `migrate`. ⚠️ neon-http is **single-statement, no interactive transactions** — run `drizzle-kit migrate` against the Neon **pooled (`-pooler`)** URL from CI/local; keep `neon-http` for the request path.

---

## §4 Frontend — TanStack SPA (no SSR)

### Vite + React 19 + React Compiler

- **Rec:** **React 19.2.7** + **React Compiler 1.0 (GA, no RC)** via `babel-plugin-react-compiler@1.0.0`, wired through **`@rolldown/plugin-babel`** + `reactCompilerPreset()` — **NOT** the old `react({ babel })` option (`@vitejs/plugin-react@6` dropped its internal Babel for oxc/Rust). `build.sourcemap: true` (Sentry).
- **Config:**
  ```ts
  import react, { reactCompilerPreset } from "@vitejs/plugin-react";
  import babel from "@rolldown/plugin-babel";
  export default defineConfig({
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    build: { sourcemap: true },
  });
  ```
- **ESLint:** use **`eslint-plugin-react-hooks@7.1.1`** `recommended-latest` (the compiler rules merged into it); the standalone `eslint-plugin-react-compiler` is **deprecated**. `$0` runtime (compiler is build-time).

### TanStack Router + Query (+ Form + Table + Store)

- **Rec:** all stable on `latest` — `@tanstack/react-router@1.170.16` (+ `router-plugin@1.168.18`), `react-query@5.101.0`, `react-form@1.33.0`, `react-table@8.21.3`, `react-store@0.11.0`. Router file-based; Form/Table/Store are headless (no providers). Router plugin goes **before** `react()`. (Add `@tanstack/react-virtual@3.14.3` for the catalog table at scale.)

### State (§9.7)

- **Rec:** start with **`@tanstack/react-store@0.11.0`** for client-only synchronous UI/session state (doesn't conflict with Query's server state or Dexie's durable queue). Add **XState** later, scoped to the **gameplay scoring state machine** (waiting → count-in → playing → paused → ended → summary). Pin the exact Store version (pre-1.0).

### Shadcn + Tailwind v4 + tokens

- **Rec:** **Tailwind v4.3.1** (CSS-first `@theme {}`, `@tailwindcss/vite@4.3.1`) + **shadcn 4.11.0** (`pnpm dlx shadcn@latest init`). Teal tokens `--color-brand-400:#2dd4bf; --color-brand-700:#0f766e;` bridged to `--color-primary`. Add `@/*` → `./src/*` alias in tsconfig + vite. Brand stays teal; purple (Okabe-Ito `#CC79A7`) only as a functional/score colour.

### Auth client — oidc-client-ts (in-memory)

- **Rec:** `**oidc-client-ts@3.5.0`**, Authorization Code + **PKCE** vs Cognito Hosted UI, tokens in an **in-memory `Storage` (a `Map`)\*\* for both `userStore` and `stateStore` (default is `sessionStorage` — XSS-readable; override it); `automaticSilentRenew` via `/auth/silent-renew`. CSP `frame-src` + `form-action` must include the Cognito domain (roll out report-only first). CI guard: fail if `localStorage`/`sessionStorage` appears in auth config.

### AlphaTab [MUST]

- **Rec:** `**@coderline/alphatab@1.8.3`** + its **official `@coderline/alphatab/vite` plugin** (handles worker + SoundFont + Bravura font copy) — **NOT** `vite-plugin-static-copy` (v1.8 prints a runtime warning if bundled without the plugin). `enablePlayer`/cursor on; bind the scoring loop to the **`playerPositionChanged`\*\* event (`{ currentTime, endTime }` ms — verify tick fields against the pinned `1.8.3` types). Lazy-chunk the player route. Served from S3/CloudFront → `$0`.

### Error + analytics

- **Rec:** `**@sentry/react@10.59.0`** (browser SDK) + `@sentry/vite-plugin@5.3.0` (sourcemap upload). Analytics = **GA4\*\* (`gtag`) for v1 behind consent (§9.4); CSP allow `www.googletagmanager.com` / `www.google-analytics.com`.

---

## §5 Offline + mobile + MIDI seam

### Dexie + insert-only outbox + ULID [MUST]

- **Rec:** `**dexie@4.4.4` + `dexie-react-hooks` + `ulid@3.0.2` (`monotonicFactory`)\*\* + a hand-rolled outbox (~150 LoC). No sync framework (RxDB rejected — paywall): client-minted ULID + insert-only = idempotent re-send via `ON CONFLICT DO NOTHING`, so there is no merge/conflict problem for a framework to solve.
- **Schema:** `catalogCache` (server-id read cache), `outbox` (`++seq` = drain order, `state` queued→inflight→done/rejected, `batchId`), `userContent` (client-ULID PK). Drain is idempotent, batched, FK-safe by `seq`; terminal vs transient rejection split.
- **Server prerequisite (P1):** idempotent `POST /sync/batch` (all-or-nothing, deferrable FKs, structured `{ ok, rejected }`).

### Capacitor (iOS) + PWA fallback

- **Rec:** **Capacitor 8** (`@capacitor/core@8.4.1`, `@capacitor/filesystem@8.1.2`) — write blobs to `Directory.Library` (survives WebKit eviction; **not** `Directory.Cache`; `LibraryNoCloud` to skip iCloud backup for large caches). PWA + Capacitor share 100% of the TS source. Android stays PWA-only at v1. ⚠️ Cap 8 defaults iOS to **SPM** (not CocoaPods) — relevant to the native MIDI plugin work.

### `MidiInputPort` hexagon seam [design now, build later]

- **Rec:** a `MidiInputPort` interface (`listDevices`, `onMessage`, `close`); **never call `navigator.requestMIDIAccess` directly.**
  - **WebMidiAdapter** (desktop Chrome/Edge + Android + iOS shim): **enumerate with a manual `iter.next()` loop, never `Array.from(midiAccess.inputs.values())`** — the latter silently returns `[]` on the shim's engine (mizuhiki#11, still open; WebMIDI.js v3.x uses the breaking form internally → don't trust `WebMidi.inputs` on the shim, wrap `requestMIDIAccess` yourself). Scoring runs **in JS** off Web MIDI events.
  - **NativeCoreMidiAdapter** (iOS, fast-follow) + optional Android `android.media.midi`: **scoring runs native-side** against a pre-loaded tick map; only `{ noteId, verdict, ts }` cross the JS bridge (per-call bridge overhead is tens of ms).
  - **Factory** picks the adapter at runtime (`isCapacitor() && isIos()` → native, else Web MIDI).
- **iOS install-nudge seam:** detect iOS + no `requestMIDIAccess` in the PWA → one-time dismissible banner to install the free "Web MIDI Browser" app.

### iOS MIDI path (§9.8)

- **v1 = the shim** — AlphaTab render + synth + Web MIDI scoring already validated on Leo's prototype (incl. a 2016 iPad mini). **Web MIDI is confirmed still unsupported across ALL iOS WebKit in 2026** (caniuse: iOS Safari + WKWebView + installed PWA, through 26.5) — the shim is genuinely the only iOS-web MIDI path. The manual `iter.next()` enumeration is what makes it work; latency ~15–25 ms on old iPads (fine for casual v1).
- **Fast-follow = fork `capacitor-musetrainer-midi`** (real repo `musetrainer/capacitor-musetrainer-midi`, **MIT**, but stale: `0.2.3` / Cap-**4** / iOS+Web, **no Android**, last commit 2023). "Fork over custom" because the hard Swift/CoreMIDI wiring exists — but budget a **heavy** fork: Cap 4→8 (SPM) bump + add the Android Kotlin bridge + **bypass its `webmidi@^3` web layer** (it hits the shim `Array.from` bug). Keep "custom" as a live fallback.
- **Hard rule:** smoke-test **any** new JS audio/timing lib on the iOS-shim WebView before depending (e.g. **Tone.js** — has a documented old-iOS Web-Audio failure history #666/#695/#713; AlphaTab's backing-track mode is the Tone-free fallback).

---

## §6 Cross-cutting — type-safety + linting + autofix

### Linter/formatter (§9.5) — NH-42 closed: ESLint + Prettier, NO Biome

- **Decision:** keep the **NestJS 11 default** — `eslint.config.mjs` (flat) with **typescript-eslint** (`recommendedTypeChecked` + `parserOptions.projectService`) + **Prettier** (run as `eslintPluginPrettierRecommended`). ESLint v10 (Feb 2026) removed eslintrc entirely → flat config is the only path; a fresh `nest new` scaffolds it natively, so the linter and `nest g` agree by construction (no churn).
- **Why NOT Biome:** Biome's `useImportType` autofix rewrites injected-service imports to `import type` → **breaks Nest DI** (confirmed, Biome issues #2003/#4514; Biome's own docs say disable-with-decorators). typescript-eslint auto-detects decorator files and skips them. Biome also **structurally cannot** do the type-aware async rules a Lambda backend needs (`no-floating-promises`, `no-misused-promises`, `await-thenable`). A formatter-only Biome config is an optional later perf escape hatch — **never let Biome lint `server/`**.
- **Structural rules (tool-independent, keep):** `import-x/no-default-export@4.16.2` (scope to `server/src/{core,adapters,modules}` — `main.ts`/`*.config.*` legitimately default-export), `check-file@3.3.1` kebab-case + role-suffix (`ignoreMiddleExtensions: true`), `@eslint-community/eslint-comments@4.7.2` `no-unlimited-disable`, `no-restricted-imports` banning `@nestjs/*`/`@aws-sdk/*`/`@pulumi/*` from `core/`.

### The rest

- **EditorConfig:** root `.editorconfig` — `lf`, 2-space, final newline, trim trailing ws.
- **Lefthook 2.1.9** (the version that adds the hooks-path reset): pre-commit = format (Prettier, staged) + lint (`eslint --fix --max-warnings 0`, staged) + typecheck + layout-guard + gitleaks + semgrep; pre-push = test; commit-msg = commitlint. ⚠️ The worktree **absolute-path shim leak (#1398) is still open** — run `lefthook install --reset-hooks-path` via the **binary directly** (not `pnpm exec`) in a `prepare` step per worktree.
- **commitlint:** `@commitlint/cli@21.0.2` + `config-conventional@21.0.2`, `body-max-line-length: [2,'always',200]` (room for AI bodies + `Co-Authored-By`).
- **TypeScript strict:** `tsconfig.base.json` `strict: true` + add **`noUncheckedIndexedAccess`** + **`exactOptionalPropertyTypes`** (cheapest while empty). **Defer `isolatedDeclarations`** — structurally moot: SWC compiles + esbuild bundles, no `.d.ts` emit step for it to accelerate. `typescript@5.7+`.
- **dependency-cruiser 17.4.3:** **folder-level** under `server/src/` (Nx tags are gone): forbid `core → adapters|infra`, `core → @aws-sdk|@pulumi|@nestjs`, plus `no-circular` + `no-orphans` (excluding `*.test|*.stories|*.d`). Belt-and-suspenders with the ESLint `no-restricted-imports`.
- **Dep health:** **Knip 6.17.1** (cover all workspaces; treat `*.test.*`/`*.stories.*` as entry points), **Syncpack 15.3.2** (`versionGroups` pinning `typescript` + `@types/node` identical), **Renovate** (grouped — verified to collapse what would be 18 Dependabot PRs into ~6; `minimumReleaseAge: '3 days'`, automerge only `lockFileMaintenance`).
- **Security (CI + hooks):** **gitleaks 8.30.1** — use `gitleaks git` (the `gitleaks detect` form is **deprecated** since 8.19.0); **semgrep 1.167.0** `--config auto` (add `--metrics=off` + pinned rulesets if the repo goes private); **osv-scanner 2.4.0** (`osv-scanner-action@v2` reading `osv-scanner.toml`). All free.
- **Package manager / monorepo (§9.6):** **pnpm workspaces**, orchestrated by plain `pnpm -r --if-present run <target>` — **no Turborepo** (flip when packages ≥ ~8, edges ≥ ~6, or cold build > ~30–60 s). pnpm `allowBuilds` for `@swc/core`, `lefthook`, `esbuild`.

---

## §7 Testing + CI/CD

- **Server tests → Vitest 4.1.9** _(Leo, 2026-06-20)_. NestJS SWC + Vitest recipe: `nest g`'s Jest-style specs run **unchanged** under `globals: true`. One `server/.swcrc` serves build + test (`module.type` is top-level → Vitest overrides it inline to `es6` via `swc.vite({ module: { type: 'es6' } })`; the shared `jsc` block is read by both). ⚠️ **Do NOT copy the official recipe verbatim** — it omits the decorator-metadata transform → DI breaks (issue #14653); keep the transform in the shared `.swcrc` + a `reflect-metadata` `setupFiles`. Pin `@swc/core@1.15.41` and add a one-test DI smoke check (vitest4 + unplugin-swc pairing not officially documented).
  ```ts
  // server/vitest.config.ts
  import swc from "unplugin-swc";
  import tsconfigPaths from "vite-tsconfig-paths";
  export default defineConfig({
    test: { globals: true, setupFiles: ["reflect-metadata"] },
    plugins: [tsconfigPaths(), swc.vite({ module: { type: "es6" } })],
  });
  ```
- **Client tests → Vitest 4.1.9** + `jsdom@29.1.1` + (nice-to-have) `@testing-library/react@16.3.2`.
- **E2E → Playwright 1.61.0:** `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`; upload `test-results/` via **`actions/upload-artifact@v7`** `if: always()` (NH-197). Public-repo Actions minutes + artifact storage are free.
- **Visual regression → Playwright `toHaveScreenshot()`** (baselines in git, $0) over **Chromatic** (5k snapshots/mo free → $179/mo cliff). ⚠️ Generate baselines in the official `mcr.microsoft.com/playwright` Docker image CI uses, or cross-OS font diffs flake. Chromatic free tier is the escape hatch later.
- **Storybook 10.4.6** (`@storybook/react-vite`); import the Tailwind CSS entry in `preview.ts`.
- **CI — GitHub Actions + OIDC-to-AWS:** **`aws-actions/configure-aws-credentials@v6`** (NOT v4) with `permissions: id-token: write`, role trust scoped to `repo:leocaseiro/notation-hero:ref:refs/heads/master`. Lint/typecheck/test via `pnpm -r`. Pulumi `up` from CI under that role.
- **size-limit → `@size-limit/preset-app@12.1.0`:** JS budget `200 kB`, CSS `20 kB` in `client`; raise once AlphaTab is lazy-chunked + profiled.
- **Later (mention, don't build):** LocalStack (M1, when DynamoDB lands), coverage-ratchet, Stryker (v1.5 on the `core/` scoring engine).
- **Perf (NH-198):** route code-splitting + lazy-load AlphaTab/player + the size-limit budgets.

---

## Reconciled cross-cutting calls

1. **Lambda entry = serverless-express; oRPC mounts inside Nest.** NestJS is the door (ADR-locked); the handler wraps the Nest Express instance; oRPC is mounted _inside_ via `@orpc/nest`. The standalone oRPC-Lambda adapter is not used.
2. **One `.swcrc`, two consumers.** `nest build --builder swc` (CJS bundle) and Vitest (`unplugin-swc`, ES module inline override) read the **same** `server/.swcrc` decorator-metadata config — never duplicate it.
3. **oRPC is ESM-only → always bundled, never `--external`.** The single most likely build break.

---

## Open decisions (≤7)

1. **Post-v1 analytics revisit** — GA4 (v1) → revisit PostHog (free 1M events/mo, real game events, reverse proxy) vs CloudFront-logs→Athena (adblock-proof) when undercount bites.
2. **iOS native MIDI fork timing** — fork `capacitor-musetrainer-midi` is a _heavy_ lift (Cap 4→8 + Android + web-enum bypass); schedule as a post-v1 fast-follow, keep "custom plugin" as fallback.
3. **Drizzle 1.0 migration** — currently 0.45.x; a 1.0 RC exists; budget a migration when it GAs.
4. **Turborepo flip** — adopt only at ≥8 packages / ≥6 edges / >30–60 s cold build.
5. **XState adoption** — when the gameplay scoring state machine lands (not v1 general state).
6. **Waterfall-view player audio lib** — if it needs Tone.js, smoke-test on the iOS shim first; else use AlphaTab backing-track mode.
7. **Chromatic** — adopt the free tier only if Playwright VR baselines flake badly or multi-browser visual coverage is wanted.

---

## Phase-1 must-verify (checks, not decisions)

- **`.swcrc` DI smoke-test:** `nest g resource modules/x` → confirm DI resolves at runtime (build with SWC + run) — the decorator-metadata transform is the trap.
- **`nest g` zero-churn:** generated output passes `eslint --fix` + `prettier --check` with no diff at `printWidth: 100`.
- **Vitest decorator metadata:** one test instantiating a DI-wired provider passes under `unplugin-swc` (pin `@swc/core`).
- **oRPC bundling:** build output contains `@orpc/*` (not externalized); `reflect-metadata` first.
- **OAC body hash:** SPA sends `x-amz-content-sha256` on POST/PUT through CloudFront→Function URL (test in hello-world before the auth gate).
- **Function URL authType:** flip `infra/` Function URL `NONE → AWS_IAM` + add the CloudFront-OAC `lambda:Invoke*` permissions before any real data ships.
- **`nodejs24.x` in ap-southeast-2:** one `pulumi up` smoke deploy of a Node 24 Lambda in Sydney.
- **CSP hosts:** Cognito (`frame-src`/`form-action`) + GA (`www.googletagmanager.com`/`www.google-analytics.com`) — roll CSP out report-only first.
- **AlphaTab bundle:** lazy-chunk + re-tune the 200 kB size-limit budget when wired (NH-198).
- **DynamoDB 25/25 incl. GSIs** (M1) — base table + all GSIs ≤ 25/25 provisioned.

---

## Version pins (verified 2026-06-20)

| Area       | Package                                                                                   | Pin                                                    |
| ---------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| IaC        | `@pulumi/pulumi` / `@pulumi/aws`                                                          | `^3.247` / `^7.34`                                     |
| Lambda     | `@codegenie/serverless-express` / `esbuild` (pin exact)                                   | `^5.0` / `0.28.1`                                      |
| Backend    | NestJS / `@orpc/*` / `zod` / `aws-jwt-verify` / `@swc/core`                               | `11` / `^1.14` / `^4.4` / `^5.2` / `1.15.41`           |
| ORM        | `drizzle-orm` / `drizzle-kit` / `drizzle-zod` / `@neondatabase/serverless`                | `^0.45` / `^0.31` / `^0.8` / `^1.1`                    |
| Frontend   | `react` / `react-dom` / `vite` / `@vitejs/plugin-react` / `babel-plugin-react-compiler`   | `19.2.7` / `19.2.7` / `^8.0` / `^6.0` / `^1.0`         |
| TanStack   | router / router-plugin / query / form / table / store                                     | `1.170` / `1.168` / `5.101` / `1.33` / `8.21` / `0.11` |
| UI         | `tailwindcss` / `@tailwindcss/vite` / `shadcn` / `oidc-client-ts` / `@coderline/alphatab` | `^4.3` / `^4.3` / `4.x` / `^3.5` / `^1.8`              |
| Offline    | `dexie` / `ulid` / `@capacitor/core` / `@capacitor/filesystem`                            | `^4.4` / `^3.0` / `^8.4` / `^8.1`                      |
| Lint       | `eslint` / `typescript-eslint` / `eslint-plugin-react-hooks` / `dependency-cruiser`       | `^10` / latest / `^7.1` / `^17.4`                      |
| Lint+      | `eslint-plugin-import-x` / `eslint-plugin-check-file` / `knip` / `syncpack` / `lefthook`  | `^4.16` / `^3.3` / `^6.17` / `^15.3` / `^2.1.9`        |
| Test/CI    | `vitest` / `unplugin-swc` / `@playwright/test` / `storybook` / `@size-limit/preset-app`   | `^4.1` / `^1.5` / `^1.61` / `^10.4` / `^12`            |
| CI actions | `configure-aws-credentials` / `upload-artifact` / `osv-scanner-action`                    | `v6` / `v7` / `v2`                                     |
| Analytics  | GA4 (`gtag`) v1; `posthog-js` (post-v1 revisit)                                           | n/a / latest                                           |

## Sources

Per-area primary sources are in each research track's output. AWS free-tier claims verified against `aws.amazon.com/<service>/pricing`; npm versions against the registry; library maintenance against GitHub release dates — all 2026-06-20. Cross-checked against the prior consolidated doc at `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/nh-clean-slate-spike/docs/spikes/2026-06-19-clean-slate-infra-tooling-app-skeleton.md` (this fresh pass agrees on the stack; divergences from it: analytics framing, version corrections — React Compiler 1.0 GA via `@rolldown/plugin-babel`, AlphaTab official Vite plugin, Capacitor 8, `gitleaks git`, `configure-aws-credentials@v6`, `upload-artifact@v7`, `eslint-plugin-react-hooks@7`).
