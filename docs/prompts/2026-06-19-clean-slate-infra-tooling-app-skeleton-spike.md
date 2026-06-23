# Notation Hero — clean-slate infra + tooling + app-skeleton spike

## How to behave (read first)

- BE DECISIVE. Per decision: ONE recommendation + a one-line rationale + the concrete command/config. No option-surveys, no invented edge cases.
- FREE TIER is the tiebreaker on everything. AWS $0-at-hobby-scale wins. (This is why we avoid SSR.)
- The ANCHOR is NestJS generators: tooling CONFORMS to `nest g`, never fights it (no autofix/format churn on generated files).
- Verify against CURRENT 2026 official docs; no training assumptions. No leading terms on web search.
- Time-to-ship matters — converge, don't sprawl. Park extras in ONE "open decisions" list (≤10) at the end.
- READ the prior-art first (§8): `docs/spikes/*.md` + `docs/decisions/decision-registry.md`. Those are INPUT, not pre-decisions — you may choose differently, but DON'T re-derive settled facts or re-run a spike that already exists there.

## 0. Clean slate

Forget every prior coding-standards/tooling decision. Rethink from scratch — but read §8 + §9 before deciding.

## 1. Fixed constraints (optimize for these)

1. Free tier #1. 2. AWS cloud learning. 3. Time to ship. 4. Solo dev + AI agents.
2. Extensible later (Kafka/MSK, K8s-local-docker) without rewrite.
3. Domain: notationhero.com (Namecheap, unconfigured; MANUAL free DNS, avoid paid; ACM certs are free).

## 2. Infrastructure (AWS, free-tier-first — infra ONLY here)

Recommend the $0 shape, per item:

- Compute: **Lambda** + **Function URL + OAC** (no API Gateway — free-tier).
- Data: **Neon Postgres** (catalog) + **DynamoDB** (per-user) + **DynamoDB Streams** (sync feed).
- Edge/hosting: **S3 + CloudFront** (static SPA) + **ACM** (free TLS).
- Auth [MUST]: **Cognito + Google federation**.
- Messaging: **SQS / SNS** (consider EventBridge).
- Secrets: **SSM Parameter Store** (+ **KMS**).
- Observability/SRE: **CloudWatch** (logs/metrics). X-Ray/ADOT = expandable later.
- Error logging [MUST v1]: **Sentry**.
- Traffic analytics [MUST v1]: start simplest (GA4), file a ticket to graduate → see §9.4.
- IaC: see §9.1 (open spike).
- Expandable later: Route 53 (only via the free/manual path), WAF, Step Functions, ElastiCache, Kafka/MSK, K8s-local.
- Do NOT propose (rejected — see §8): Firebase, Supabase, Amplify, Aurora/RDS, API Gateway.

## 3. Backend — NestJS on Lambda, generators-first [CRITICAL]

- **NestJS** with FULL `nest g` support (scaffolding AND ongoing new files: `co`/`s`/`resource`/…) + REQUIRED **DDD + Hexagon** the generators scaffold into.
- `nest g` output MUST pass type-check + lint + format with ZERO churn.
- Lambda packaging → §9.2. ORM → §9.3.
- Typed FE↔BE contract: **oRPC** (prior art §8: succeeds the stale ts-rest) — confirm unless a clearly-better 2026 option.
- Validation: **Zod** (shared). Auth-in-Nest: **aws-jwt-verify** guards + a framework-free `can(user,item,action)` policy in core.
- Compiler: **SWC** (emits the decorator metadata DI needs).

## 4. Frontend — TanStack SPA, NOT SSR [CRITICAL]

- **Vite + React 19 + React Compiler.**
- **TanStack Router + Query** [MUST] (+ **Form** + **Table**). State: **TanStack Store** to start; (preferable) **XState**, but only if it doesn't complicate Query or offline-first.
- UI [MUST]: **Shadcn + Tailwind + design tokens** (reuse the existing teal Tailwind mockups as context).
- Auth client: **oidc-client-ts** (in-memory tokens, no localStorage).
- **AlphaTab render + player [MUST, non-negotiable]** — handles notation/parse/import/export/playback (render FE, and parse on BE).
- Sentry (`@sentry/react`) + traffic analytics [both MUST v1].

## 5. Offline + mobile [MUST]

- Offline **catalog + gameplay + sync**: **Dexie** (IndexedDB) + insert-only **outbox** + **ULID** (a prior spike exists — reuse it). Do not consider RxDB as capacitor is $99/m.
- **Capacitor (iOS)** + **PWA fallback**. **Android deferred** (PWA covers it; revisit only if PWA-on-Android falls short). Capacitor Filesystem for blobs.
- **MIDI input seam [design now, build later]** — see `docs/spikes/2026-06-18-webmidi-input-ios-bridge.md`. Abstract MIDI behind a `MidiInputPort` (hexagon) with swappable adapters: **Web MIDI** (desktop Chrome/Edge + Android), **native iOS CoreMIDI bridge** (Capacitor Swift plugin), and an optional **native Android `android.media.midi` bridge** (Kotlin, tighter latency). NEVER call `navigator.requestMIDIAccess` directly. Hit-SCORING must run **native-side** (only verdict events cross the JS bridge — bridge overhead is tens of ms).
  - **🍎 iOS strategy [v1 = WEB via the shim; native is a fast-follow].** iOS Safari / WKWebView / PWA have no Web MIDI — BUT iOS users CAN run the app with MIDI today via the free third-party **"Web MIDI Browser"** app (the `WebMIDIAPIShimForiOS` shim); Leo proved it (AlphaTab render + Web MIDI scoring on a 2016 iPad mini). **v1 ships iOS on this shim**, with an in-app **nudge** to install it. Native Capacitor + CoreMIDI is a **fast-follow soon after v1**, NOT the v1 gate. The rule is therefore **"every MIDI feature must stay shim-compatible,"** not "avoid the shim."
  - **🚧 Two HARD constraints keep the shim path alive (non-negotiable):** **(1) Shim-safe MIDI enumeration** — `Array.from(midiAccess.inputs.values())` silently returns `[]` on the shim's ancient engine (the `.values()` **iterator** isn't seen as iterable → `Array.from` falls back to array-like → no `.length` → empty; bug mizuhiki#11). **Enumerate with a manual `iter.next()` loop** (verified). ⚠️ **WebMIDI.js v3.x uses the breaking `Array.from` form internally** → don't trust `WebMidi.inputs` on the shim; wrap `requestMIDIAccess` yourself. **(2) Smoke-test EVERY JS library on the iOS-shim WebView before depending on it** — the ancient engine breaks some modern libs. **AlphaTab (notation render + its synth + Web MIDI scoring) is ALREADY validated on the shim** (Leo's JS-PWA prototype, iOS-shim + Android). A **future waterfall-view player** (a separate new UI, _not_ the notation view) is **NOT yet validated** — if it uses **Tone.js** or another audio/timing lib, smoke-test that lib on the shim first (Tone.js is untested here; AlphaTab's backing-track / external-media modes are a Tone-free option).
  - NEVER call `navigator.requestMIDIAccess` directly — go through the `MidiInputPort`. Native-side scoring applies to the **native bridges** (CoreMIDI / `android.media.midi`, to dodge JS-bridge latency); on the **web/shim path** scoring runs in JS off Web MIDI events (no bridge, so fine). The MIDI _feature_ ships later, but the **port + shim-safe Web MIDI adapter + custom-native-plugin capability** must exist in the architecture now.

## 6. Cross-cutting — type-safety + linting + autofix [CRITICAL]

- Choose the linter/formatter that BEST serves: (1) the generators (no-fight), (2) type-safety, (3) flawless autofix (editor + commit-hook + CI). Whatever linting servess generators+autofix+type-safety best, use it (§9.5).
- **EditorConfig** + **Lefthook** (commit hooks) + **commitlint**. **TypeScript strict**. **dependency-cruiser** (Hexagon boundaries).
- Shared FE/BE style preferred (one editorconfig-level: quotes/semicolons/indent); different-per-package OK only with flawless autofix.
- **Package manager: pnpm** (one shared FE+BE). Prior art §8: chosen for disk/strictness/speed; its old Nx-coupling reason is void but pnpm stands. (npm = simpler fallback.)
- Monorepo: **pnpm workspaces** (orchestration → §9.6; Nx is dropped).
- Dep health: **Knip, Syncpack, Renovate/Dependabot**. Security (CI): **gitleaks, semgrep, osv-scanner**.

## 7. Testing + CI/CD

- Server: **Vitest** (NestJS `swc#vitest` recipe — `nest g`'s Jest-style specs run under Vitest globals; decided — DACI L5 + D3). Client: **Vitest** (or whatever TanStack favors). E2E: **Playwright** + **trace artifacts in CI** (NH-197). **Visual regression** (Chromatic / Playwright snapshots / Storybook test-runner). **Storybook**. react-testing-library = nice-to-have if it doesn't fight TanStack. Later: LocalStack, coverage-ratchet, Stryker.
- **GitHub Actions + OIDC-to-AWS**; autofix enforced in CI + hooks; **size-limit** budget. (We DO want CI — only the _old CI decisions_ are forgotten.)
- Perf plan (NH-198): route code-splitting + lazy-loading (AlphaTab/player) + bundle budgets.

## 8. Prior art — validated facts (INPUT; don't re-derive — read the docs, you MAY still choose differently)

**Full reasoning is documented in `docs/spikes/*.md` and `docs/decisions/decision-registry.md` — read them before re-spiking anything.** Highlights that WON'T change:

- ts-rest is stale/frozen (issue #797 unresolved 2026) → **oRPC** is the live successor. (`docs/spikes/2026-06-17-typed-contract-orpc.md`)
- SSR fights the $0 free tier (per-request compute) → SPA on S3+CloudFront is $0. No Next.js / no TanStack Start. (`…fe-framework-nextjs.md`, `…tanstack-cli-addons-spa-vs-start.md`)
- Amplify abstracts AWS → less learning value → Cognito + your-IaC directly. (`…amplify-auth-cognito-admin-onramp.md`)
- ElectricSQL is Postgres-only → can't sync DynamoDB → sync frameworks (TanStack DB/Replicache/Zero/RxDB) deferred; v1 = insert-only outbox. (`…tanstack-db-fit.md`, `…offline-first-sync.md`)
- Biome's `useImportType` autofix breaks Nest DI on decorated files → if Biome, format-only; ESLint is DI-safe. (`…biome-vs-eslint-spike.md`, `…nestjs-generators-and-nofight.md`)
- `nest g` emits Jest specs + Prettier-flavored code (default 80-col wraps a `nest g resource` import) → run the generated specs under **Vitest** (NestJS `swc#vitest` recipe), NOT Jest (decided — DACI L5 + D3); lineWidth ≥ 100. (`…nestjs-generators-and-nofight.md`)
- **Web MIDI is unsupported on ALL of iOS in 2026** (Safari, WKWebView, installed PWA — all WebKit); Android + desktop-Chromium DO support it. **DECISION (2026-06-19): iOS v1 ships on the WEB via the third-party "Web MIDI Browser" shim** (`WebMIDIAPIShimForiOS`) — proven on a 2016 iPad mini (AlphaTab render + Web MIDI scoring) — with an in-app nudge to install it; native Capacitor + CoreMIDI is a **fast-follow** soon after v1, not the v1 gate. **Two hard constraints keep the shim path alive:** (1) MIDI enumeration must use a **manual `iter.next()` loop, not `Array.from(midiAccess.inputs.values())`** (the latter silently returns `[]` on the shim — the iterator isn't seen as iterable → array-like fallback → empty; mizuhiki#11; WebMIDI.js v3.x uses the breaking form internally); (2) **smoke-test every JS library on the iOS-shim WebView** (its ancient engine breaks some modern libs). **AlphaTab notation player + synth + scoring are ALREADY validated on the shim** (Leo's PWA prototype); a future waterfall-view player is not — if it uses Tone.js/another audio lib, test that on the shim first (Tone.js untested there). Abstract MIDI behind the port; native-side scoring is for the native bridges only. (`docs/spikes/2026-06-18-webmidi-input-ios-bridge.md`)
- Rejected early (don't re-propose unless free-tier+learning changes): Firebase, Supabase; Expo/Flutter/React Native/Electron-in-v1 (Capacitor+React won; Electron = desktop v2); **Tauri** (WKWebView lacks Web MIDI); Bun; Aurora/RDS (Neon $0); API Gateway (Function URL $0); RxDB (premium-storage paywall).

## 9. Open spikes — decide fresh (free-tier + AWS-learning lens; each: recommend + rationale + $0 note)

1. **IaC**: Pulumi (Leo's preference, but not a blocker) vs AWS CDK vs SST vs Terraform.
2. **Lambda packaging**: adapter + bundler (e.g. serverless-express + esbuild vs alternatives).
3. **ORM**: Drizzle vs Prisma vs Kysely vs TypeORM (+ Kanel if DB-first). Must be Neon-HTTP + SWC friendly.
4. **Traffic analytics**: GA4-now vs PostHog vs Plausible vs CloudFront-logs+Athena (MUST v1; pick simplest free start + a graduate path).
5. **Linter/formatter**: evaluate **NestJS-default ESLint first (Biome-free)** under NH-42 (generator-fit + autofix + type-safety); do NOT re-run the dropped Biome-vs-ESLint comparison.
6. **Monorepo orchestration**: plain pnpm workspaces vs Turborepo.
7. **State**: TanStack Store vs XState (offline-first compatibility).
8. **iOS MIDI path (v1 = the shim).** v1: ship iOS on the **"Web MIDI Browser" shim** (AlphaTab + MIDI already proven on Leo's JS-PWA prototype) — confirm shim-safe MIDI enumeration (**manual `iter.next()` loop, not `Array.from`**) + acceptable latency + wire the iOS install-nudge. **Rule:** smoke-test any NEW JS lib on the shim WebView before depending on it (e.g. **Tone.js** for a future waterfall-view player — untested on the shim). Fast-follow (post-v1): native CoreMIDI Capacitor plugin — fork stale `capacitor-musetrainer-midi` (v0.2.3 / Cap-4, iOS + Web only, **no Android**) vs custom. See the WebMIDI spike.

## 10. Deliverable

Per area in §2–§7 + each §9 spike: recommendation + one-line rationale + concrete command/config. End with a single "open decisions" list (≤7). Tickets already filed: NH-197 (Playwright traces), NH-198 (perf/code-split). Nothing beyond this scope.

## 11. Out of scope for THIS prompt (separate feature spec)

Notation model / catalog CMS / tonal schema / GrooveScribe import (a simple JS we already have) / player UX / game scoring / gameplay rendering (canvas/PixiJS). IN scope: AlphaTab _capability_ + design tokens + the **MIDI port seam** (§5). Noted-but-not-built features: e-drum **MIDI input** + multi-zone MIDI mapping + the **iOS "install Web MIDI Browser" nudge** + a future **waterfall-view player** (architecture seam + shim-safe Web MIDI adapter ARE in scope — see the WebMIDI spike); audio engine (**AlphaTab synth is validated on the shim**; any other audio lib — e.g. Tone.js for a waterfall view — must be shim-tested first).
