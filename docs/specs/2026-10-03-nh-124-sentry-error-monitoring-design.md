# Sentry error monitoring for `web/` — NH-124

Date: 2026-10-03
Status: Design approved by leocaseiro on 2026-10-03, section by section (four sections, ten
decisions). Not implemented. The plan comes next.
Ticket: [NH-124](https://leocaseiro.atlassian.net/browse/NH-124) — "[H-8] Sentry client error
tracking", in the epic NH-180 "Observability & SRE".

## Goal

Every error a visitor meets in `web/` reaches Sentry — whether our code catches it or not — and
neither the score, nor its file name, nor anything in it leaves the device.

## Non-goals

- **No burn rates, no SLOs.** A rate needs every attempt counted, not only the failures, and that is
  usage tracking. It belongs to [NH-52](https://leocaseiro.atlassian.net/browse/NH-52) ("[H-7]
  CloudWatch + X-Ray SLOs"). Until NH-52 lands, Sentry Release Health — the crash-free share of
  visits per release — is the interim front-end health number. The reasoning is recorded as a
  comment on NH-52, dated 2026-10-03.
- **No performance tracing, no Session Replay, no feedback widget.** Errors only. Replay would record
  the score drawn on screen.
- **No server or edge SDK.** `web/` has no runtime server code: no route handlers, no server
  actions, and no `cookies()`, `headers()` or `searchParams` anywhere under `web/app`. Both pages are
  static.
- **No tunnel.** A visitor whose ad blocker stops `sentry.io` is not bypassed (decision D3).
- **No preview deployments.** Production only (decision D5).
- **Not `client/`.** The design system and the paused catalog page are out of scope; the one catch
  block there (`client/src/components/About.tsx:65`) stays as it is.
- **No size gate.** The bundle cost is measured and recorded, not enforced. A size gate is the
  separate pending decision L12-size.

## Why this exists

Today a failure in a visitor's browser is visible in exactly one place: that browser's console. The
player shows an error code for every failure it knows about (`shared/src/error-codes.ts`, E101 to
E901) so that a visitor can quote one — but nothing tells us a failure happened unless the visitor
writes to us.

Nothing in `web/` reports anything. There are 16 catch blocks, 4 failure paths that never throw (a
font event, a timer, an engine event, a repaired-settings restore), and 2 error pages that receive a
React crash and send it nowhere.

The decision to use Sentry is old: L11-sentry, June 2026, "Sentry for client JS errors from commit #1
(source maps + release tagging); painful to retrofit, free tier". It was then deliberately left out of
v0 and listed on [NH-298](https://leocaseiro.atlassian.net/browse/NH-298).

## Decisions

All approved by leocaseiro on 2026-10-03. The changelog entry of the same date records the reasons.

| ID  | Decision                                                                                                       | Rejected                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| S1  | Report every error; remove file names and contents before sending; reword the privacy copy                     | an opt-in switch in Settings; sending file names and removing the promise   |
| S2  | Sentry carries errors and warnings only — no counting of attempts                                              | usage counters in Sentry (needs its own privacy decision; belongs to NH-52) |
| S2b | Storage the browser blocks (a private window) leaves a breadcrumb only                                         | stay silent; send a warning on every blocked visit                          |
| S3  | Errors only                                                                                                    | performance tracing; Session Replay                                         |
| S4  | Release Health on, as the interim health number until NH-52                                                    | off                                                                         |
| D1  | `@sentry/nextjs`, browser part only                                                                            | `@sentry/react` plus our own upload script; Sentry's Loader Script          |
| D2  | Known engine noise is dropped, using one list that the e2e gate also reads                                     | send it at `info` level; send it as normal errors                           |
| D3  | No tunnel                                                                                                      | `tunnelRoute` through our own domain                                        |
| D4  | Source maps: Sentry's default (uploaded to Sentry, deleted from the deploy); Sentry shows the code around them | also serve them publicly; keep "Hide source content" on                     |
| D5  | Production only                                                                                                | production and preview deployments                                          |

## 1. Packages and files

One new dependency: `@sentry/nextjs` (major version 11), in `web/package.json` only. The version is
whatever pnpm resolves under the 7-day `minimumReleaseAge` gate; the plan records it.

**New files:**

| File                                       | Job                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/instrumentation-client.ts`            | Starts Sentry before the page becomes interactive. With no DSN the SDK sends nothing — which is the state locally, in CI unit tests, and on preview deployments. |
| `web/app/global-error.tsx`                 | Catches a crash in the root layout itself. Today there is none, so a root-layout crash shows Next's bare default page.                                           |
| `web/lib/monitoring/report.ts`             | `reportError()` and `noteError()`. Apart from `instrumentation-client.ts`, the only file that imports Sentry.                                                    |
| `web/lib/monitoring/scrub.ts`              | The privacy filter (section 3).                                                                                                                                  |
| `web/lib/monitoring/known-engine-noise.ts` | The known AlphaTab throws, shared by the Sentry filter and `web/e2e/page-errors.ts` (section 2.6).                                                               |
| `web/e2e/error-reporting.e2e.ts`           | The end-to-end reporting and privacy cases (section 6).                                                                                                          |

Each `lib/monitoring` file has its unit test beside it.

**Changed files:** `web/next.config.ts` (the `withSentryConfig` wrapper), both `error.tsx` files, the
16 catch sites and 4 failure paths listed in section 2.4, `web/app/page.tsx` (copy),
`web/eslint.config.mjs` (the rule), `web/e2e/page-errors.ts` (reads the shared list), the `/`
screenshot baselines, `web/README.md` (the environment variables), the `web` CI job (a fake DSN),
`cspell.json`, and the decision registry and changelog.

## 2. How each error reaches Sentry

```text
an error happens
 ├─ uncaught: a throw, a rejected promise, a worker error ──► Sentry's global handlers ─┐
 ├─ a React render crash ─► error.tsx / global-error.tsx ─► reportError() ───────────────┤
 ├─ AlphaTab's 'error' event, a music-font failure ─► reportError() ─────────────────────┤
 └─ inside try/catch ─► reportError() (error or warning) / noteError() (breadcrumb) ─────┤
                                                                                         ▼
                              scrub.ts (names → [file]; known engine noise dropped) ─► sentry.io
```

### 2.1 Errors nobody catches

| Channel                                        | Caught by                                                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| a `throw` in an event handler, timer or effect | Sentry's global `error` handler — automatic                                                                                                     |
| a rejected promise nobody awaited              | Sentry's global `unhandledrejection` handler — automatic                                                                                        |
| a throw inside AlphaTab's Web Worker           | It reaches the page's `error` handler. Evidence: that is how the e2e lane caught NH-335's worker TypeError (`web/e2e/page-errors.ts`).          |
| a throw inside AlphaTab's AudioWorklet         | **Not caught.** A worklet error does not reach the page. Only what AlphaTab forwards through its own `error` event arrives. See "Known limits". |
| a React render crash                           | The error pages, which swallow it today — section 2.2.                                                                                          |

### 2.2 The error pages

`web/app/error.tsx` and `web/app/play/error.tsx` receive the crash and currently ignore it. Each gains
one line, and the new `global-error.tsx` carries the same line:

```diff
-export default function AppError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
+export default function AppError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
+  useEffect(() => reportError(error, { code: ERROR.unexpectedCrash }), [error]);
```

`global-error.tsx` replaces the root layout when it renders, so it supplies its own `<html>` and
`<body>` and imports `globals.css` itself.

### 2.3 The reporting functions

```ts
// web/lib/monitoring/report.ts
type FileFacts = { readonly type: string; readonly bytes: number }; // never the name

/** An error or a warning: one event against the monthly quota. */
export function reportError(
  error: unknown,
  options?: { code?: ErrorCode; level?: 'error' | 'warning'; file?: FileFacts },
): void;

/** A breadcrumb: never sent alone; it travels inside the next real report. Costs no quota. */
export function noteError(error: unknown, what: string): void;
```

- `level` defaults to `error`.
- `code` becomes the Sentry tag `code`, so a visitor who quotes "Error E203" maps straight to a
  Sentry search.
- **E101, E102 and E103 drop the exception message** and keep its type, its stack, and the file's
  type and size. The engine's parse message can quote text from inside the file (section 3.1).

### 2.4 Every handled failure in `web/`

**Inside try/catch — all 16:**

| Where                                                                                          | What fails                                    | Code      | Sends                                                 |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------- | --------- | ----------------------------------------------------- |
| `web/lib/alphatab/AlphaTabEngineContext.tsx:35`                                                | the player engine did not load                | E201      | error                                                 |
| `web/app/play/PlayerShell.tsx:805`                                                             | the same failure, met when a file is opened   | E205      | breadcrumb — E201 has already reported the cause      |
| `web/app/play/PlayerShell.tsx:309`                                                             | stored settings cannot be applied at start    | —         | error                                                 |
| `web/app/play/PlayerShell.tsx:743` and `:761`                                                  | MIDI and Guitar Pro export                    | E401      | error                                                 |
| `web/lib/alphatab/live-settings.ts:165`                                                        | the engine refused a value our checks allowed | E602      | warning                                               |
| `web/app/play/PlayerShell.tsx:872`                                                             | the file is not a score                       | E103      | warning, with file type and size                      |
| `web/app/play/OpenFileControl.tsx:75`, `web/app/play/PlayerShell.tsx:969`                      | the file is too large, or cannot be read      | E101/E102 | warning, with file type and size                      |
| `web/lib/alphatab/settings-storage.ts:195`                                                     | the saved settings are not valid JSON         | (E603)    | a lint opt-out with a reason: its caller reports E603 |
| `web/app/play/PlayerShell.tsx:190`, `web/lib/alphatab/transport-storage.ts:129`                | storage blocked while reading                 | —         | breadcrumb                                            |
| `web/app/play/PlayerShell.tsx:220`, `:594`, `:722`, `web/app/play/useRestoredTransport.ts:114` | storage blocked or full while writing         | —         | breadcrumb                                            |

**Failures that never throw** — an event, a timer, or a state change:

| Where                                              | What fails                                          | Code      | Sends   |
| -------------------------------------------------- | --------------------------------------------------- | --------- | ------- |
| `web/app/play/NotationSurface.tsx:117`             | the music font failed to download                   | E203      | error   |
| `web/app/play/NotationSurface.tsx:126`             | the music font did not arrive within 60 seconds     | E204      | error   |
| `web/app/play/NotationSurface.tsx:139`             | AlphaTab's `error` event, for example the SoundFont | E202      | error   |
| `web/app/play/PlayerShell.tsx`, both restore paths | saved settings or transport repaired, or unreadable | E601/E603 | warning |

**Blocked is not corrupt.** Storage the browser _blocks_ is the visitor's environment: a breadcrumb
(S2b). Saved data that is _corrupt_ means our own code wrote something bad, or an update changed which
values are valid. That is a bug signal, so it sends a warning.

### 2.5 The lint rule

Two selectors make a catch that reports nothing a lint error. Both were run against a scratch file
on 2026-10-03 with the installed ESLint 9.39.4: they flagged exactly `catch { }` and
`.catch(() => null)`, and passed every form that calls `reportError` or `noteError`.

```js
{ selector: 'CatchClause:not(:has(CallExpression[callee.name=/^(reportError|noteError)$/]))', … },
{ selector: "CallExpression[callee.property.name='catch'] > :function:not(:has(CallExpression[callee.name=/^(reportError|noteError)$/]))", … },
```

- **They join the existing `no-restricted-syntax` list** at `web/eslint.config.mjs:68`. A second
  block that sets the same rule would silently replace the AlphaTab dynamic-import fence already
  there. If the new selectors need a narrower `files` scope (test files are exempt), that block must
  repeat the fence's selector, held in a shared constant.
- **A deliberate silence** is `// eslint-disable-next-line no-restricted-syntax -- <reason>`. The
  repository already requires a reason on every disable comment
  (`eslint-comments/require-description`).

### 2.6 Known engine noise

AlphaTab 1.8.4 throws two errors that break nothing a person can see:

- **NH-335:** `Cannot read properties of undefined (reading 'voices')`, from inside its worker, on
  ordinary Guitar Pro files — seven times in one open of `guitar-no-percussion.gp`.
- **NH-338:** `cannot call stop without calling start first`, in 7 of 10 quick Pause clicks.

Sent as they are, a handful of visitors would use hundreds of the 5,000 monthly reports on two bugs
we already know about.

`web/e2e/page-errors.ts` already excuses exactly these two, and only when **every** stack frame sits
in the engine bundle `/alphatab/esm/alphaTab.core.mjs`; the same words thrown from our own code still
fail. That list moves to `web/lib/monitoring/known-engine-noise.ts`. The e2e gate reads it from a
stack string and the Sentry filter reads it from Sentry's structured frames, so removing one entry
when NH-335 or NH-338 is fixed updates both.

## 3. Privacy

### 3.1 What could leave the device, and what stops it

| What                                           | How it would leak                                                                                                                                                                                                                                                                                            | What stops it                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| track names, title, artist, album              | **Verified in Sentry's source** (`packages/browser-utils/src/htmlTreeAsString.ts:156`): click breadcrumbs record each element's `aria-label`, `type`, `name`, `title` and `alt`. The Solo, Mute and Render buttons are labelled `` `Solo ${name}` `` (`client/src/components/ui/TrackRow/TrackRow.tsx:246`). | the names filter (3.2) replaces them with `[file]`                                                                   |
| the file name                                  | any error message that quotes it — none does today                                                                                                                                                                                                                                                           | the same filter                                                                                                      |
| the score's contents — notes, lyrics, alphaTex | AlphaTab's console logs, and its parse messages, can quote a broken alphaTex line                                                                                                                                                                                                                            | console breadcrumbs are off entirely; E101–E103 drop the exception message (2.3)                                     |
| IP address, cookies, headers, query strings    | collected by Sentry's defaults                                                                                                                                                                                                                                                                               | `dataCollection` turns each one off, **and** the project setting "Prevent Storing of IP Addresses" is on (section 5) |

The copy says "anonymous", so the IP address must be stopped on **both** sides: Sentry's docs warn
that with `userInfo` off, an IP address can still arrive through headers, cookies or query strings.

### 3.2 The names filter

```ts
// web/lib/monitoring/scrub.ts
export function rememberOpenFile(fileName: string): void; // called when a file is picked
export function rememberScore(score: ScoreFacts): void; // title, subtitle, artist, album, words,
// music, copyright, tab author, and every track's name and short name
```

- **The list never forgets** within a tab. A breadcrumb about file A can still be in the trail after
  file B opens.
- **Strings shorter than 3 characters are skipped**, so a track named `1` does not rewrite unrelated
  text.
- **Both ends:** breadcrumbs are filtered when they are recorded (`beforeBreadcrumb`), and the whole
  event again when it is sent (`beforeSend`), which also covers names registered after a breadcrumb
  was recorded.
- **Stack frames are not touched.** File paths in frames are our code, not the visitor's.

### 3.3 SDK settings

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // absent → the SDK sends nothing
  release: APP_VERSION,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, urlQueryParams: false },
  integrations: [breadcrumbsIntegration({ console: false })],
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: (event) => (isKnownEngineNoise(event) ? null : scrubEvent(event)),
});
```

The exact shape of `dataCollection` is confirmed against the installed types (see "To verify").

### 3.4 The copy

```text
Before (web/app/page.tsx:9):  …and play along. Nothing you open leaves this device.
After:                        …and play along. Your scores never leave this device. The player
                              sends anonymous crash statistics, and an error report when it
                              breaks — never your file, its name, or what's in it.

Before (web/app/error.tsx:12 and web/app/play/error.tsx:12):
                              Nothing you opened was sent anywhere. Try again, or reload the page.
After (both, and the new global-error.tsx):
                              Errors are reported automatically — without your file, its name, or
                              what's in it. Try again, or reload the page.
```

The error pages deliberately do **not** say "a report was sent". An ad blocker may have stopped it,
and the page cannot know.

"Crash statistics" is Release Health (S4): a small ping on every visit, not only on a crash. It
carries the release, the environment and whether the visit crashed — no file data. That is why the
home page names it.

## 4. Releases, environments and source maps

- **Release** = the existing `APP_VERSION` (`web/lib/app-version.ts`), for example
  `v0.26.09.21-1143.5f027f6`. The source-map upload reads the same `NEXT_PUBLIC_APP_VERSION`, which
  the `build` script already sets for `next build`, so a report always matches its own maps.
- **Environment** = `NEXT_PUBLIC_VERCEL_ENV`. With D5 only `production` reports.
- **Source maps** (D4): `withSentryConfig` uploads them after `next build` (Turbopack builds are
  supported from `@sentry/nextjs` 10.13) and deletes them from the deploy by default
  (`sourcemaps.deleteSourcemapsAfterUpload: true`). "Hide source content" stays **off**: the
  repository is public, so hiding the code in Sentry protects nothing and removes the code around
  each error line.
- **No upload without a token.** `SENTRY_AUTH_TOKEN` exists only in Vercel's Production environment.
  Preview builds, CI builds and local builds skip the upload, and the wrapper is told so rather than
  left to warn.
- **The build plugin's own telemetry is off** (`telemetry: false`).

```ts
// web/next.config.ts
export default withSentryConfig(nextConfig, {
  org: '<org-slug>', // filled in from section 5, step 1 — not secret
  project: '<project-slug>',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: { name: process.env.NEXT_PUBLIC_APP_VERSION },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
```

## 5. Setup — done by leocaseiro, by hand

An agent may not create accounts or handle the token.

1. Create a Sentry account on the free Developer plan, and a project with the platform **Next.js**.
   Note the organization and project slugs for `next.config.ts`.
2. Project settings → Security & Privacy → turn on **"Prevent Storing of IP Addresses"**.
3. Create an **organization auth token**, used only for the source-map upload.
4. Vercel → the project → Settings → Environment Variables, **Production only** (D5):
   - `NEXT_PUBLIC_SENTRY_DSN` — public by design; it ships inside the page.
   - `SENTRY_AUTH_TOKEN` — marked **Sensitive**. Never in chat, never in the repository.
5. After the first production deploy, open a file that is not a score. An E103 warning appearing in
   Sentry, with the file's type and size and without its name, proves the whole path.

This replaces two registry rows written for GitHub Actions: L11-envsecret required a `production-build`
GitHub environment for the upload job, and F7-sentry required `SENTRY_AUTH_TOKEN` as a GitHub Actions
secret. The upload now runs inside Vercel's build, so neither GitHub mechanism applies.

## 6. Testing

- **Unit (Vitest), beside each `lib/monitoring` file:**
  - the names filter: the file name, the title and every track name become `[file]`; strings shorter
    than 3 characters are left alone; stack frames are untouched;
  - `reportError`: the default level, the `code` tag, and E101–E103 dropping the message;
  - known engine noise: a throw whose frames all sit in the engine bundle is dropped; the same
    message with one frame from our code is kept.
- **Lint canary:** a test runs ESLint over a silent `catch { }` and expects it to fail, so the rule
  cannot stop working quietly — the same idea as `tooling/check-core-purity-canary.sh`.
- **End to end (Playwright, in the existing `web` job):**
  - The CI build sets a fake DSN, `https://public@sentry.invalid/1`. One shared fixture routes every
    request to that host, answers it, and records the envelope, so nothing reaches the network and
    the real SDK is under test with no test code in the app.
  - **Cases that already force a failure** get one extra assertion each: the engine-module abort
    (`web/e2e/player-states.ts:55`) must produce E201, the font abort (`web/e2e/player.e2e.ts:218`)
    E203, and the SoundFont abort (`web/e2e/player.e2e.ts:267`) E202.
  - **New cases in `web/e2e/error-reporting.e2e.ts`:**
    1. A throw injected by the test (`page.evaluate`) sends an `error`.
    2. Opening a file that is not a score sends an E103 `warning` with its type and size, and no name.
    3. Open a sample whose name, title and track names are known, click Solo, then cause an error:
       the raw envelope contains none of those strings.
    4. Opening `guitar-no-percussion.gp` (the NH-335 file) sends no error.
    5. With storage blocked by an init script, nothing is sent until a real error, and that report
       carries the storage breadcrumb.
- **Screenshots:** the new home-page copy changes the `/` shots. The `web/` baselines are regenerated
  in the Linux container (`pnpm test:web:docker:update`) and committed.
- **Download size:** `/play`'s first-load JavaScript is measured before and after, and both numbers go
  in the PR description.

## 7. Documents that change

- `docs/decisions/decision-changelog.md` — the 2026-10-03 entry recording these decisions.
- `docs/decisions/decision-registry.md` — L11-sentry points at this spec; L11-srcmap reworded (D4);
  L11-envsecret superseded; F7-sentry rewritten for Vercel. Flips to ✅ happen in the implementation
  PR.
- `web/README.md` — the Deploy section names both environment variables.
- **Jira, at implementation:** the two NH-298 checklist items "Sentry integration" and "Test the
  'Nothing you open leaves this device' claim" change. The second's future same-origin test must now
  allow exactly the Sentry ingest host — and only once this ships.

## Known limits

- **AudioWorklet errors.** A throw inside AlphaTab's sound thread is reported only if AlphaTab
  forwards it through its `error` event. Untested.
- **Ad-blocked visitors.** Their reports never arrive (D3). After a month, Release Health's session
  count against Vercel's visit count shows how many are missed.
- **The quota.** Past 5,000 errors in a month, Sentry refuses further reports until it resets — "Events
  and attachments that exceed your quota will not be accepted" (Sentry's quota docs). The SDK stops
  sending without any sign to the visitor, and Release Health keeps counting. There is no per-page cap:
  Sentry already drops an event identical to the one before it, which covers the usual error in a
  loop. If volume ever grows, the setting to turn is `sampleRate`. On the free plan, per-key rate
  limits and spike protection are not available.
- **Release Health pings on every visit**, not only on a crash. The home-page copy says so.

## To verify at plan time

Each is a claim this design rests on but no one has run yet:

- One build with `withSentryConfig` beside `reactCompiler`, `transpilePackages`, the AlphaTab copy
  step and the design-system CSS check. This is a go/no-go: if the wrapper breaks the build, D1 falls
  back to `@sentry/react` plus our own upload script.
- The exact shape of `dataCollection` in the installed version.
- That the browser SDK sends Release Health sessions by default.
- That `NEXT_PUBLIC_VERCEL_ENV` is exposed on Vercel for this project.
- What argument AlphaTab's `error` event passes — an `Error` or a string.
- That Vercel never builds a fork's pull request with Production variables.
- That Playwright can route a request to the `.invalid` host before any DNS lookup.
